import type { NextRequest } from "next/server";
import { after } from "next/server";
import { authorize, unauthorized } from "@/lib/auth";
import { getSource, processSource } from "@/lib/learn/sources";

export const maxDuration = 300;

/** POST /api/sources/:id/process — relance le pipeline (après une erreur). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorize(request))) return unauthorized();
  const { id } = await params;
  if (!(await getSource(id))) return Response.json({ error: "not_found" }, { status: 404 });
  after(() => processSource(id));
  return Response.json({ ok: true }, { status: 202 });
}
