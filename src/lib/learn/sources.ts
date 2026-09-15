import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db";
import { cards, concepts, documents, reviews, sources, type Card, type Concept, type Document, type LearnSource, type SourceKind } from "@/db/schema";
import { detectLanguage } from "@/lib/ai/mock";
import { generateCards } from "./cards";
import { chunkText, cleanText, extractPdf, extractUrl } from "./extract";
import { applyReview, gradeFromScore, newCardState, retrievability, type Grade } from "./fsrs";
import { gradeAnswer } from "./grade";
import { synthesize } from "./synthesize";

const now = () => new Date().toISOString();
const MAX_CHARS = 400_000;

export type CreateSourceInput =
  | { kind: "pdf"; data: Uint8Array; originalName: string; title?: string }
  | { kind: "url"; url: string; title?: string }
  | { kind: "text"; text: string; title?: string };

/** Extrait le texte et crée la source (statut "summarizing"). Le reste tourne en arrière-plan. */
export async function createSource(input: CreateSourceInput): Promise<LearnSource> {
  const db = await getDb();
  let text = "";
  let pageCount: number | null = null;
  let title = input.title?.trim() || "";
  let url: string | null = null;
  let originalName: string | null = null;
  const kind: SourceKind = input.kind;

  if (input.kind === "pdf") {
    const out = await extractPdf(input.data);
    text = out.text;
    pageCount = out.pageCount ?? null;
    originalName = input.originalName;
    title ||= input.originalName.replace(/\.pdf$/i, "");
  } else if (input.kind === "url") {
    const out = await extractUrl(input.url);
    text = out.text;
    pageCount = out.pageCount ?? null;
    url = input.url;
    title ||= out.title || input.url;
  } else {
    text = cleanText(input.text);
    title ||= text.split("\n")[0]!.slice(0, 80);
  }
  if (text.length < 200) throw new Error("too_little_text");
  text = text.slice(0, MAX_CHARS);

  const row: LearnSource = {
    id: randomUUID(),
    title: title.slice(0, 160),
    kind,
    originalName,
    url,
    text,
    charCount: text.length,
    pageCount,
    language: detectLanguage(text.slice(0, 5000)),
    status: "summarizing",
    error: null,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.insert(sources).values(row);
  return row;
}

/** Pipeline : synthèse → concepts → cartes vérifiées. Idempotent par étape. */
export async function processSource(id: string): Promise<void> {
  const db = await getDb();
  const src = await getSource(id);
  if (!src) return;
  try {
    let doc = await getDocument(id);
    if (!doc) {
      await db.update(sources).set({ status: "summarizing", error: null, updatedAt: now() }).where(eq(sources.id, id));
      const synth = await synthesize(src.text, { title: src.kind === "text" ? null : src.title });
      doc = {
        id: randomUUID(),
        sourceId: id,
        title: synth.title,
        summary: synth.summary,
        sections: synth.sections,
        keyPoints: synth.key_points,
        glossary: synth.glossary,
        openQuestions: synth.open_questions,
        model: "",
        version: 1,
        createdAt: now(),
      };
      await db.insert(documents).values({ ...doc, model: process.env.OPENAI_MODEL ?? "" });
      const seen = new Set<string>();
      const rows: Concept[] = synth.concepts
        .filter((c) => c.name.trim() && !seen.has(c.name.trim().toLowerCase()) && seen.add(c.name.trim().toLowerCase()))
        .map((c, i) => ({ id: randomUUID(), sourceId: id, name: c.name.trim(), description: c.description.trim(), mastery: 0, order: i, createdAt: now() }));
      if (rows.length) await db.insert(concepts).values(rows);
      await db.update(sources).set({ title: synth.title.slice(0, 160), language: synth.language || src.language, status: "generating", updatedAt: now() }).where(eq(sources.id, id));
    }

    const existingCards = await db.select({ n: sql<number>`count(*)` }).from(cards).where(eq(cards.sourceId, id));
    if (Number(existingCards[0]?.n ?? 0) === 0) {
      await db.update(sources).set({ status: "generating", updatedAt: now() }).where(eq(sources.id, id));
      const cs = await listConcepts(id);
      const generated = await generateCards(doc, cs, 3);
      if (generated.length) {
        await db.insert(cards).values(
          generated.map((g) => ({ id: randomUUID(), sourceId: id, ...g, ...newCardState(), createdAt: now() })),
        );
      }
    }
    await db.update(sources).set({ status: "ready", error: null, updatedAt: now() }).where(eq(sources.id, id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[leni] source ${id} failed:`, message);
    await db.update(sources).set({ status: "error", error: message, updatedAt: now() }).where(eq(sources.id, id));
  }
}

export async function getSource(id: string): Promise<LearnSource | null> {
  const db = await getDb();
  return (await db.select().from(sources).where(eq(sources.id, id)).limit(1))[0] ?? null;
}
export async function getDocument(sourceId: string): Promise<Document | null> {
  const db = await getDb();
  return (await db.select().from(documents).where(eq(documents.sourceId, sourceId)).limit(1))[0] ?? null;
}
export async function listConcepts(sourceId: string): Promise<Concept[]> {
  const db = await getDb();
  return db.select().from(concepts).where(eq(concepts.sourceId, sourceId)).orderBy(asc(concepts.order));
}

export type SourceStats = { cards: number; verified: number; due: number; mastery: number; reviews: number };

export async function sourceStats(sourceId: string): Promise<SourceStats> {
  const db = await getDb();
  const all = await db.select().from(cards).where(and(eq(cards.sourceId, sourceId), eq(cards.flagged, false)));
  const verified = all.filter((c) => c.verified);
  const nowD = new Date();
  const due = verified.filter((c) => new Date(c.due) <= nowD).length;
  const mastery = verified.length ? Math.round((verified.reduce((s, c) => s + retrievability(c, nowD), 0) / verified.length) * 100) : 0;
  const rv = await db.select({ n: sql<number>`count(*)` }).from(reviews).where(eq(reviews.sourceId, sourceId));
  return { cards: all.length, verified: verified.length, due, mastery, reviews: Number(rv[0]?.n ?? 0) };
}

export type SourceSummary = Omit<LearnSource, "text"> & SourceStats;

/** Toutes les sources avec leurs statistiques, en trois requêtes quel que soit leur nombre. */
export async function listSources(): Promise<SourceSummary[]> {
  const db = await getDb();
  const [rows, allCards, reviewCounts] = await Promise.all([
    db
      .select({
        id: sources.id, title: sources.title, kind: sources.kind, originalName: sources.originalName, url: sources.url,
        charCount: sources.charCount, pageCount: sources.pageCount, language: sources.language, status: sources.status,
        error: sources.error, createdAt: sources.createdAt, updatedAt: sources.updatedAt,
      })
      .from(sources)
      .orderBy(desc(sources.createdAt)),
    db
      .select({ sourceId: cards.sourceId, verified: cards.verified, due: cards.due, stability: cards.stability, difficulty: cards.difficulty, reps: cards.reps, lapses: cards.lapses, state: cards.state, lastReview: cards.lastReview, scheduledDays: cards.scheduledDays, learningSteps: cards.learningSteps })
      .from(cards)
      .where(eq(cards.flagged, false)),
    db.select({ sourceId: reviews.sourceId, n: sql<number>`count(*)` }).from(reviews).groupBy(reviews.sourceId),
  ]);
  const nowD = new Date();
  const rv = new Map(reviewCounts.map((r) => [r.sourceId, Number(r.n)]));
  const by = new Map<string, typeof allCards>();
  for (const c of allCards) by.set(c.sourceId, [...(by.get(c.sourceId) ?? []), c]);
  return rows.map((r) => {
    const cs = by.get(r.id) ?? [];
    const verified = cs.filter((c) => c.verified);
    const due = verified.filter((c) => new Date(c.due) <= nowD).length;
    const mastery = verified.length ? Math.round((verified.reduce((s, c) => s + retrievability(c as Card, nowD), 0) / verified.length) * 100) : 0;
    return { ...r, cards: cs.length, verified: verified.length, due, mastery, reviews: rv.get(r.id) ?? 0 };
  });
}

/** Cartes à réviser maintenant : dues d'abord, puis nouvelles, formats mélangés. */
export async function sessionCards(sourceId: string, limit = 10): Promise<Card[]> {
  const db = await getDb();
  const nowIso = now();
  const due = await db
    .select()
    .from(cards)
    .where(and(eq(cards.sourceId, sourceId), eq(cards.verified, true), eq(cards.flagged, false), lte(cards.due, nowIso)))
    .orderBy(asc(cards.due))
    .limit(limit * 2);
  // Alterner les formats pour ne pas enchaîner dix quiz.
  const buckets = new Map<string, Card[]>();
  for (const c of due) buckets.set(c.format, [...(buckets.get(c.format) ?? []), c]);
  const order = ["quiz", "open", "explain", "exercise"];
  const out: Card[] = [];
  while (out.length < limit && [...buckets.values()].some((b) => b.length)) {
    for (const f of order) {
      const b = buckets.get(f);
      if (b?.length && out.length < limit) out.push(b.shift()!);
    }
  }
  return out;
}

export async function getCard(id: string): Promise<Card | null> {
  const db = await getDb();
  return (await db.select().from(cards).where(eq(cards.id, id)).limit(1))[0] ?? null;
}

export type AnswerResult = { correct: boolean; score: number; feedback: string; missing: string[]; reference: string; explanation: string; grade: Grade; due: string };

/** Corrige (si besoin), applique FSRS, journalise, recalcule la maîtrise du concept. */
export async function answerCard(card: Card, input: { optionIndex?: number; answerText?: string; elapsedMs?: number }): Promise<AnswerResult> {
  const db = await getDb();
  let score: number;
  let feedback = "";
  let missing: string[] = [];
  if (card.format === "quiz") {
    const correct = Number(card.answer) === input.optionIndex;
    score = correct ? 1 : 0;
  } else {
    const g = await gradeAnswer(card, input.answerText ?? "");
    score = g.score;
    feedback = g.feedback;
    missing = g.missing;
  }
  const grade = gradeFromScore(score);
  const next = applyReview(card, grade);
  await db.update(cards).set(next).where(eq(cards.id, card.id));
  await db.insert(reviews).values({
    id: randomUUID(),
    cardId: card.id,
    sourceId: card.sourceId,
    rating: grade,
    correct: score >= 0.7,
    answerText: card.format === "quiz" ? (input.optionIndex != null ? card.options[input.optionIndex] ?? null : null) : input.answerText ?? null,
    feedback: feedback || null,
    elapsedMs: input.elapsedMs ?? null,
    createdAt: now(),
  });
  await recomputeMastery(card.conceptId);
  return {
    correct: score >= 0.7,
    score,
    feedback,
    missing,
    reference: card.format === "quiz" ? card.options[Number(card.answer)] ?? card.answer : card.answer,
    explanation: card.explanation,
    grade,
    due: next.due,
  };
}

async function recomputeMastery(conceptId: string): Promise<void> {
  const db = await getDb();
  const cs = await db.select().from(cards).where(and(eq(cards.conceptId, conceptId), eq(cards.verified, true), eq(cards.flagged, false)));
  const nowD = new Date();
  const mastery = cs.length ? Math.round((cs.reduce((s, c) => s + retrievability(c, nowD), 0) / cs.length) * 100) : 0;
  await db.update(concepts).set({ mastery }).where(eq(concepts.id, conceptId));
}

export async function flagCard(id: string): Promise<void> {
  const db = await getDb();
  await db.update(cards).set({ flagged: true }).where(eq(cards.id, id));
}

export async function deleteSource(id: string): Promise<boolean> {
  const db = await getDb();
  await db.delete(reviews).where(eq(reviews.sourceId, id));
  await db.delete(cards).where(eq(cards.sourceId, id));
  await db.delete(concepts).where(eq(concepts.sourceId, id));
  await db.delete(documents).where(eq(documents.sourceId, id));
  return (await db.delete(sources).where(eq(sources.id, id))).rowsAffected > 0;
}

/** Cartes dues aujourd'hui, toutes sources confondues (accueil). */
export async function dueCount(): Promise<number> {
  const db = await getDb();
  const r = await db.select({ n: sql<number>`count(*)` }).from(cards).where(and(eq(cards.verified, true), eq(cards.flagged, false), lte(cards.due, now())));
  return Number(r[0]?.n ?? 0);
}

export { chunkText };
