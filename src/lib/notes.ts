import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db";
import { KINDS, notes, type Kind, type Note, type Source } from "@/db/schema";
import { dedupCategory, enrich } from "./ai/enrich";
import {
  findSimilarCategory,
  getCategory,
  listCategories,
  listSuggestedThemes,
  normalizeName,
  promoteSuggestedTheme,
  THEME_EMERGENCE_THRESHOLD,
} from "./categories";

export type NoteListFilters = {
  q?: string;
  category?: string;
  kind?: Kind;
  tag?: string;
  archived?: boolean;
  limit?: number;
};

const nowIso = () => new Date().toISOString();

export async function listNotes(filters: NoteListFilters = {}): Promise<Note[]> {
  const db = await getDb();
  const conds = [eq(notes.archived, filters.archived ?? false)];
  if (filters.category) {
    conds.push(eq(notes.category, filters.category));
  }
  if (filters.kind && KINDS.includes(filters.kind)) {
    conds.push(eq(notes.kind, filters.kind));
  }
  if (filters.tag) {
    // tags est un JSON array ; json_each permet de filtrer sur ses éléments.
    conds.push(
      sql`exists (select 1 from json_each(${notes.tags}) where json_each.value = ${filters.tag})`,
    );
  }
  if (filters.q?.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    conds.push(
      or(
        like(notes.content, pattern),
        like(notes.rawText, pattern),
        like(notes.title, pattern),
        like(notes.summary, pattern),
        like(notes.tags, pattern),
        like(notes.placeName, pattern),
      )!,
    );
  }
  return db
    .select()
    .from(notes)
    .where(and(...conds))
    .orderBy(desc(notes.pinned), desc(notes.capturedAt))
    .limit(filters.limit ?? 500);
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return rows[0] ?? null;
}

export type CreateNoteInput = {
  rawText: string;
  source: Source;
  capturedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  languageHint?: string | null;
  audioPath?: string | null;
};

/**
 * Crée la note immédiatement en statut "processing". L'enrichissement est
 * lancé séparément (voir `processNote`) pour répondre vite au Raccourci.
 */
export async function createNote(input: CreateNoteInput): Promise<Note> {
  const db = await getDb();
  const ts = nowIso();
  const capturedAt = parseIsoOrNow(input.capturedAt);
  const row: typeof notes.$inferInsert = {
    id: randomUUID(),
    rawText: input.rawText,
    content: input.rawText,
    title: "",
    summary: "",
    language: input.languageHint ?? "und",
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    source: input.source,
    audioPath: input.audioPath ?? null,
    status: "processing",
    capturedAt,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.insert(notes).values(row);
  return (await getNote(row.id))!;
}

/** Lance l'enrichissement d'une note et enregistre le résultat (ou l'erreur). */
export async function processNote(id: string): Promise<Note | null> {
  const note = await getNote(id);
  if (!note) return null;
  const db = await getDb();
  await db.update(notes).set({ status: "processing", error: null, updatedAt: nowIso() }).where(eq(notes.id, id));
  try {
    const [categories, pending] = await Promise.all([listCategories(), listSuggestedThemes()]);
    const { enrichment, enrichedBy } = await enrich({
      rawText: note.rawText,
      capturedAt: note.capturedAt,
      categories,
      pendingThemes: pending.map((p) => p.name),
      languageHint: note.language === "und" ? null : note.language,
      latitude: note.latitude,
      longitude: note.longitude,
    });
    const decision = resolveCategory(enrichment, categories);
    console.info("[leni] theme:", JSON.stringify({ slug: enrichment.category_slug, ideal: enrichment.ideal_theme?.name, ...decision }));
    await db
      .update(notes)
      .set({
        title: enrichment.title,
        content: enrichment.content,
        summary: enrichment.summary,
        analysis: enrichment.analysis || null,
        category: decision.category,
        suggestedTheme: decision.suggestedTheme,
        suggestedThemeDescription: decision.suggestedThemeDescription,
        kind: enrichment.kind,
        tags: normalizeTags(enrichment.tags),
        actionItems: enrichment.action_items,
        entities: enrichment.entities,
        sentiment: enrichment.sentiment,
        language: enrichment.language || note.language,
        dueDate: enrichment.due_date,
        placeName: enrichment.place_name,
        enrichedBy,
        status: "ready",
        error: null,
        updatedAt: nowIso(),
      })
      .where(eq(notes.id, id));
    // Après l'enregistrement : la proposition compte désormais cette note.
    const finalCategory = await emergeThemes(decision);
    if (finalCategory !== decision.category) {
      await db.update(notes).set({ category: finalCategory, suggestedTheme: null, suggestedThemeDescription: null }).where(eq(notes.id, id));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[leni] enrichment failed for ${id}:`, message);
    await db
      .update(notes)
      .set({ status: "error", error: message, updatedAt: nowIso() })
      .where(eq(notes.id, id));
  }
  return getNote(id);
}

type ThemeDecision = { category: string; suggestedTheme: string | null; suggestedThemeDescription: string | null };

/**
 * Choisit le thème d'une note :
 *  - si le thème idéal nommé par le modèle correspond à un thème existant → celui-ci ;
 *  - sinon le meilleur thème existant, et la proposition est mémorisée sur la note.
 * Voir `emergeThemes` pour la création automatique quand une proposition revient.
 */
function resolveCategory(
  e: { category_slug: string; ideal_theme: { name: string; description: string } },
  categories: Awaited<ReturnType<typeof listCategories>>,
): ThemeDecision {
  const known = categories.find((c) => c.slug === e.category_slug) ?? findSimilarCategory(e.category_slug, categories);
  const fallback = known?.slug ?? "other";
  const ideal = e.ideal_theme?.name?.trim() ?? "";
  if (!ideal) return { category: fallback, suggestedTheme: null, suggestedThemeDescription: null };

  const similar = findSimilarCategory(ideal, categories);
  if (similar) return { category: similar.slug, suggestedTheme: null, suggestedThemeDescription: null };

  const name = canonicalThemeName(ideal);
  return { category: fallback, suggestedTheme: name, suggestedThemeDescription: e.ideal_theme.description?.trim() || null };
}

/** "jardinage " → "Jardinage" : une seule graphie par proposition. */
function canonicalThemeName(name: string): string {
  const t = name.trim().replace(/\s+/g, " ").slice(0, 40);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Création automatique d'un thème émergent : quand au moins
 * THEME_EMERGENCE_THRESHOLD notes partagent la même proposition, un second
 * avis LLM vérifie qu'aucun thème existant ne la couvre, puis le thème est
 * créé (ou les notes rattachées à l'équivalent existant).
 */
async function emergeThemes(decision: ThemeDecision): Promise<string> {
  if (!decision.suggestedTheme) return decision.category;
  const db = await getDb();
  const target = normalizeName(decision.suggestedTheme);
  const rows = await db
    .select({ name: notes.suggestedTheme, description: notes.suggestedThemeDescription })
    .from(notes)
    .where(and(eq(notes.archived, false), sql`${notes.suggestedTheme} is not null`));
  const same = rows.filter((r) => r.name && normalizeName(r.name) === target);
  if (same.length < THEME_EMERGENCE_THRESHOLD) return decision.category;

  const categories = await listCategories();
  const proposal = { name: decision.suggestedTheme, description: decision.suggestedThemeDescription ?? "" };
  const verdict = await dedupCategory(proposal, categories);
  console.info("[leni] emerging theme:", proposal.name, "→", verdict);
  const into = verdict === "create" ? undefined : (verdict ?? undefined);
  const cat = await promoteSuggestedTheme(proposal.name, proposal.description, into);
  // Les variantes de graphie (même nom normalisé) sont rattachées aussi.
  for (const r of same) {
    if (r.name && r.name !== proposal.name) await promoteSuggestedTheme(r.name, r.description ?? "", cat.slug);
  }
  return cat.slug;
}

export type UpdateNoteInput = Partial<
  Pick<
    Note,
    | "title"
    | "content"
    | "summary"
    | "category"
    | "kind"
    | "tags"
    | "actionItems"
    | "placeName"
    | "dueDate"
    | "pinned"
    | "archived"
  >
>;

export async function updateNote(id: string, patch: UpdateNoteInput): Promise<Note | null> {
  const db = await getDb();
  const clean: UpdateNoteInput = { ...patch };
  if (clean.tags) clean.tags = normalizeTags(clean.tags);
  if (clean.category && !(await getCategory(clean.category))) delete clean.category;
  await db
    .update(notes)
    .set({ ...clean, updatedAt: nowIso() })
    .where(eq(notes.id, id));
  return getNote(id);
}

export async function deleteNote(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.delete(notes).where(eq(notes.id, id));
  return result.rowsAffected > 0;
}

/** Statistiques pour la vue Explorer. */
export async function getStats() {
  const [all, cats] = await Promise.all([listNotes({ limit: 5000 }), listCategories()]);
  const byCategory: Record<string, number> = Object.fromEntries(cats.map((c) => [c.slug, 0]));
  const tagCounts = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const n of all) {
    byCategory[n.category] = (byCategory[n.category] ?? 0) + 1;
    for (const t of n.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    const day = n.capturedAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const lastDays: { key: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    lastDays.push({ key, count: byDay.get(key) ?? 0 });
  }
  return { total: all.length, byCategory, topTags, lastDays, notes: all };
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of tags) {
    const t = raw.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
    if (t && !seen.has(t)) seen.add(t);
  }
  return [...seen].slice(0, 12);
}

function parseIsoOrNow(value: string | null | undefined): string {
  if (!value) return nowIso();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? nowIso() : d.toISOString();
}
