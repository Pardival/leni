import type { NextRequest } from "next/server";
import { authorize, unauthorized } from "@/lib/auth";
import { deleteSource, getDocument, getSource, listConcepts, sourceStats } from "@/lib/learn/sources";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  if (!(await authorize(request))) return unauthorized();
  const { id } = await params;
  const source = await getSource(id);
  if (!source) return Response.json({ error: "not_found" }, { status: 404 });
  const { text: _t, ...pub } = source;
  void _t;
  const [document, concepts, stats] = await Promise.all([getDocument(id), listConcepts(id), sourceStats(id)]);
  return Response.json({ source: pub, document, concepts, stats });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await authorize(request))) return unauthorized();
  const ok = await deleteSource((await params).id);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "not_found" }, { status: 404 });
}
