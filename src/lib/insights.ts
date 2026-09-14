import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db";
import { insights, type Insight, type Lens } from "@/db/schema";
import { deepenNote } from "./ai/deepen";
import { getNote } from "./notes";

export async function listInsights(noteId: string): Promise<Insight[]> {
  const db = await getDb();
  return db.select().from(insights).where(eq(insights.noteId, noteId)).orderBy(desc(insights.createdAt));
}

export async function createInsight(noteId: string, lens: Lens, question?: string | null): Promise<Insight | null> {
  const note = await getNote(noteId);
  if (!note) return null;
  const result = await deepenNote(note, lens, question);
  if (!result) return null;
  const row: Insight = {
    id: randomUUID(),
    noteId,
    lens,
    question: lens === "question" ? question?.trim() || null : null,
    content: result.content,
    model: result.model,
    createdAt: new Date().toISOString(),
  };
  const db = await getDb();
  await db.insert(insights).values(row);
  return row;
}

export async function deleteInsight(id: string): Promise<boolean> {
  const db = await getDb();
  return (await db.delete(insights).where(eq(insights.id, id))).rowsAffected > 0;
}

export async function deleteInsightsOfNote(noteId: string): Promise<void> {
  const db = await getDb();
  await db.delete(insights).where(eq(insights.noteId, noteId));
}
