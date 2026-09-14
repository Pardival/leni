import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize, unauthorized } from "@/lib/auth";
import { deleteCategory, updateCategory } from "@/lib/categories";

type Ctx = { params: Promise<{ slug: string }> };

const Patch = z.object({ name: z.string().max(40), description: z.string().max(200), color: z.string().max(7) }).partial();

export async function PATCH(request: NextRequest, { params }: Ctx) {
  if (!(await authorize(request))) return unauthorized();
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_payload" }, { status: 400 });
  const cat = await updateCategory((await params).slug, parsed.data);
  return cat ? Response.json(cat) : Response.json({ error: "not_found" }, { status: 404 });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await authorize(request))) return unauthorized();
  const ok = await deleteCategory((await params).slug);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "not_allowed" }, { status: 400 });
}
