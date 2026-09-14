import { authorize, unauthorized } from "@/lib/auth";
import { resetAllData } from "@/lib/notes";

/** POST /api/reset { confirm: "yes" } — efface notes, audios et thèmes créés. */
export async function POST(request: Request) {
  if (!(await authorize(request))) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "yes") return Response.json({ error: "confirmation_required" }, { status: 400 });
  const result = await resetAllData();
  console.warn("[leni] data reset:", JSON.stringify(result));
  return Response.json(result);
}
