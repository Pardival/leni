import { after } from "next/server";
import type { NextRequest } from "next/server";
import { CATEGORIES, type Category } from "@/db/schema";
import { authorize, unauthorized } from "@/lib/auth";
import { createNote, listNotes, processNote } from "@/lib/notes";

/** GET /api/notes?q=&category=&tag=&archived= */
export async function GET(request: NextRequest) {
  if (!(await authorize(request))) return unauthorized();
  const p = request.nextUrl.searchParams;
  const category = p.get("category");
  const rows = await listNotes({
    q: p.get("q") ?? undefined,
    category: category && CATEGORIES.includes(category as Category) ? (category as Category) : undefined,
    tag: p.get("tag") ?? undefined,
    archived: p.get("archived") === "true",
  });
  return Response.json(rows);
}

/** POST /api/notes — création depuis l'interface web (texte uniquement). */
export async function POST(request: NextRequest) {
  if (!(await authorize(request))) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    lat?: number | null;
    lng?: number | null;
    language?: string | null;
  };
  const text = body.text?.trim();
  if (!text) return Response.json({ error: "empty_note" }, { status: 400 });
  const note = await createNote({
    rawText: text,
    source: "web",
    latitude: body.lat ?? null,
    longitude: body.lng ?? null,
    languageHint: body.language ?? null,
  });
  after(() => processNote(note.id));
  return Response.json(note, { status: 202 });
}
