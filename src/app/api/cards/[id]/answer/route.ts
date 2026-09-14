import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize, unauthorized } from "@/lib/auth";
import { answerCard, getCard } from "@/lib/learn/sources";

export const maxDuration = 60;

const Body = z.object({ optionIndex: z.number().int().min(0).max(9).optional(), answerText: z.string().max(4000).optional(), elapsedMs: z.number().int().min(0).optional() });

/** POST /api/cards/:id/answer — corrige, planifie (FSRS), journalise. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorize(request))) return unauthorized();
  const card = await getCard((await params).id);
  if (!card) return Response.json({ error: "not_found" }, { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_payload" }, { status: 400 });
  return Response.json(await answerCard(card, parsed.data));
}
