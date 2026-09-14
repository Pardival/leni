import type { NextRequest } from "next/server";
import { authorize, unauthorized } from "@/lib/auth";
import { deleteInsight } from "@/lib/insights";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorize(request))) return unauthorized();
  const ok = await deleteInsight((await params).id);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "not_found" }, { status: 404 });
}
