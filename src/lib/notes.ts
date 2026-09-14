import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db";
import { CATEGORIES, notes, type Category, type Note, type Source } from "@/db/schema";
import { enrich } from "./ai/enrich";

export type NoteListFilters = {
  q?: string;
  category?: Category;
  tag?: string;
  archived?: boolean;
  limit?: number;
};

const nowIso = () => new Date().toISOString();

export async function listNotes(filters: NoteListFilters = {}): Promise<Note[]> {
  const db = await getDb();
  const conds = [eq(notes.archived, filters.archived ?? false)];
  if (filters.category && CATEGORIES.includes(filters.category)) {
    conds.push(eq(notes.category, filters.category));
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
    const { enrichment, enrichedBy } = await enrich({
      rawText: note.rawText,
      capturedAt: note.capturedAt,
      languageHint: note.language === "und" ? null : note.language,
      latitude: note.latitude,
      longitude: note.longitude,
    });
    await db
      .update(notes)
      .set({
        title: enrichment.title,
        content: enrichment.content,
        summary: enrichment.summary,
        category: enrichment.category,
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

export type UpdateNoteInput = Partial<
  Pick<
    Note,
    | "title"
    | "content"
    | "summary"
    | "category"
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
  if (clean.category && !CATEGORIES.includes(clean.category)) delete clean.category;
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
  const all = await listNotes({ limit: 5000 });
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  const tagCounts = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const n of all) {
    byCategory[n.category]++;
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
