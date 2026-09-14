import type { NextRequest } from "next/server";
import { authorize, unauthorized } from "@/lib/auth";
import { processNote } from "@/lib/notes";

/** POST /api/notes/:id/reprocess — relance l'enrichissement et attend le résultat. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorize(request))) return unauthorized();
  const note = await processNote((await params).id);
  return note ? Response.json(note) : Response.json({ error: "not_found" }, { status: 404 });
}
