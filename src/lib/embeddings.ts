import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { embeddings, notes, type Note } from "@/db/schema";
import { contentHash, cosine, embedText, embedTexts } from "./ai/embed";
import { config } from "./config";

/** Texte représentatif d'une note pour la vectorisation. */
export function noteText(n: Pick<Note, "title" | "content" | "tags" | "summary">): string {
  return [n.title, n.summary, n.content, n.tags.map((t) => `#${t}`).join(" ")].filter(Boolean).join("\n");
}

/** Calcule (ou met à jour si le texte a changé) l'empreinte d'une note. Silencieux en mode mock. */
export async function upsertNoteEmbedding(note: Note): Promise<void> {
  const text = noteText(note);
  if (!text.trim()) return;
  const hash = contentHash(`${config.openai.embeddingModel}:${text}`);
  const db = await getDb();
  const existing = await db.select({ hash: embeddings.contentHash }).from(embeddings).where(eq(embeddings.noteId, note.id)).limit(1);
  if (existing[0]?.hash === hash) return;
  const vector = await embedText(text);
  if (!vector) return;
  await db
    .insert(embeddings)
    .values({ noteId: note.id, model: config.openai.embeddingModel, vector, contentHash: hash, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: embeddings.noteId,
      set: { model: config.openai.embeddingModel, vector, contentHash: hash, updatedAt: new Date().toISOString() },
    });
}

export async function deleteNoteEmbedding(noteId: string): Promise<void> {
  const db = await getDb();
  await db.delete(embeddings).where(eq(embeddings.noteId, noteId));
}

export type Scored = { note: Note; score: number };

/** Notes proches d'une note donnée, par sens (hors archivées). */
export async function relatedNotes(noteId: string, k = 5, minScore = 0.35): Promise<Scored[]> {
  const db = await getDb();
  const me = await db.select().from(embeddings).where(eq(embeddings.noteId, noteId)).limit(1);
  if (!me[0]) return [];
  return rank(me[0].vector, k, minScore, noteId);
}

/** Notes les plus proches d'une question libre. */
export async function searchNotes(query: string, k = 8, minScore = 0.25): Promise<Scored[]> {
  const vector = await embedText(query);
  if (!vector) return [];
  return rank(vector, k, minScore);
}

async function rank(vector: number[], k: number, minScore: number, excludeId?: string): Promise<Scored[]> {
  const db = await getDb();
  const rows = await db.select({ noteId: embeddings.noteId, vector: embeddings.vector }).from(embeddings);
  const scored = rows
    .filter((r) => r.noteId !== excludeId)
    .map((r) => ({ noteId: r.noteId, score: cosine(vector, r.vector) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k * 2);
  if (scored.length === 0) return [];
  const found = await db
    .select()
    .from(notes)
    .where(inArray(notes.id, scored.map((s) => s.noteId)));
  const byId = new Map(found.filter((n) => !n.archived).map((n) => [n.id, n]));
  return scored
    .map((s) => ({ note: byId.get(s.noteId)!, score: s.score }))
    .filter((s) => s.note)
    .slice(0, k);
}

/** Vectorise toutes les notes qui n'ont pas d'empreinte à jour (rattrapage). */
export async function rebuildEmbeddings(): Promise<{ total: number; updated: number }> {
  const db = await getDb();
  const all = await db.select().from(notes);
  const have = new Map((await db.select().from(embeddings)).map((e) => [e.noteId, e.contentHash]));
  const todo = all.filter((n) => {
    const text = noteText(n);
    return text.trim() && have.get(n.id) !== contentHash(`${config.openai.embeddingModel}:${text}`);
  });
  let updated = 0;
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const vectors = await embedTexts(batch.map(noteText));
    if (!vectors) break;
    for (let j = 0; j < batch.length; j++) {
      const n = batch[j]!;
      const text = noteText(n);
      const hash = contentHash(`${config.openai.embeddingModel}:${text}`);
      await db
        .insert(embeddings)
        .values({ noteId: n.id, model: config.openai.embeddingModel, vector: vectors[j]!, contentHash: hash, updatedAt: new Date().toISOString() })
        .onConflictDoUpdate({ target: embeddings.noteId, set: { vector: vectors[j]!, contentHash: hash, model: config.openai.embeddingModel, updatedAt: new Date().toISOString() } });
      updated++;
    }
  }
  return { total: all.length, updated };
}
