import type { NextRequest } from "next/server";
import { z } from "zod";
import { CATEGORIES } from "@/db/schema";
import { authorize, unauthorized } from "@/lib/auth";
import { deleteNote, getNote, updateNote } from "@/lib/notes";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  if (!(await authorize(request))) return unauthorized();
  const note = await getNote((await params).id);
  return note ? Response.json(note) : Response.json({ error: "not_found" }, { status: 404 });
}

const Patch = z
  .object({
    title: z.string().max(200),
    content: z.string().max(20000),
    summary: z.string().max(500),
    category: z.enum(CATEGORIES),
    tags: z.array(z.string().max(50)).max(20),
    actionItems: z.array(z.string().max(500)).max(50),
    placeName: z.string().max(200).nullable(),
    dueDate: z.string().max(40).nullable(),
    pinned: z.boolean(),
    archived: z.boolean(),
  })
  .partial();

export async function PATCH(request: NextRequest, { params }: Ctx) {
  if (!(await authorize(request))) return unauthorized();
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_payload", detail: parsed.error.issues }, { status: 400 });
  }
  const note = await updateNote((await params).id, parsed.data);
  return note ? Response.json(note) : Response.json({ error: "not_found" }, { status: 404 });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await authorize(request))) return unauthorized();
  const ok = await deleteNote((await params).id);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "not_found" }, { status: 404 });
}
