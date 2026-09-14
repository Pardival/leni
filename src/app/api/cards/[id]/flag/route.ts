import type { NextRequest } from "next/server";
import { authorize, unauthorized } from "@/lib/auth";
import { flagCard, getCard } from "@/lib/learn/sources";

/** POST /api/cards/:id/flag — « mauvaise question » : la carte n'est plus servie. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorize(request))) return unauthorized();
  const { id } = await params;
  if (!(await getCard(id))) return Response.json({ error: "not_found" }, { status: 404 });
  await flagCard(id);
  return Response.json({ ok: true });
}
