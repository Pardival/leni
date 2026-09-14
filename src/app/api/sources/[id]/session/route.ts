import type { NextRequest } from "next/server";
import { authorize, unauthorized } from "@/lib/auth";
import { sessionCards } from "@/lib/learn/sources";

/** GET /api/sources/:id/session — cartes à réviser maintenant (sans les réponses). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorize(request))) return unauthorized();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 10);
  const cards = await sessionCards((await params).id, Math.min(Math.max(limit, 1), 30));
  return Response.json(cards.map(({ answer: _a, explanation: _e, ...c }) => (void _a, void _e, c)));
}
