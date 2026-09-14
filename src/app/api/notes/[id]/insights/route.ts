import type { NextRequest } from "next/server";
import { z } from "zod";
import { LENSES } from "@/db/schema";
import { authorize, unauthorized } from "@/lib/auth";
import { createInsight, listInsights } from "@/lib/insights";

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  if (!(await authorize(request))) return unauthorized();
  return Response.json(await listInsights((await params).id));
}

const Body = z.object({ lens: z.enum(LENSES), question: z.string().trim().max(500).optional() });

/** POST /api/notes/:id/insights { lens, question? } — Approfondir. */
export async function POST(request: NextRequest, { params }: Ctx) {
  if (!(await authorize(request))) return unauthorized();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_payload" }, { status: 400 });
  if (parsed.data.lens === "question" && !parsed.data.question) return Response.json({ error: "question_required" }, { status: 400 });
  const insight = await createInsight((await params).id, parsed.data.lens, parsed.data.question);
  if (!insight) return Response.json({ error: "unavailable" }, { status: 503 });
  return Response.json(insight, { status: 201 });
}
