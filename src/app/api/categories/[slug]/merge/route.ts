import type { NextRequest } from "next/server";
import { authorize, unauthorized } from "@/lib/auth";
import { mergeCategory } from "@/lib/categories";

/** POST /api/categories/:slug/merge { into } — déplace les notes puis supprime la source. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await authorize(request))) return unauthorized();
  const { into } = (await request.json().catch(() => ({}))) as { into?: string };
  if (!into) return Response.json({ error: "invalid_payload" }, { status: 400 });
  const ok = await mergeCategory((await params).slug, into);
  return ok ? Response.json({ ok: true }) : Response.json({ error: "not_found" }, { status: 404 });
}
