import { authorize, unauthorized } from "@/lib/auth";
import { dismissSuggestedTheme, listSuggestedThemes, promoteSuggestedTheme } from "@/lib/categories";

/** GET /api/categories/suggested — propositions de thèmes en attente. */
export async function GET(request: Request) {
  if (!(await authorize(request))) return unauthorized();
  return Response.json(await listSuggestedThemes());
}

/** POST /api/categories/suggested { name, description?, into? } — crée le thème (ou rattache à `into`). */
export async function POST(request: Request) {
  if (!(await authorize(request))) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { name?: string; description?: string; into?: string };
  if (!body.name?.trim()) return Response.json({ error: "invalid_payload" }, { status: 400 });
  const cat = await promoteSuggestedTheme(body.name, body.description ?? "", body.into);
  return Response.json(cat, { status: 201 });
}

/** DELETE /api/categories/suggested { name } — écarte la proposition. */
export async function DELETE(request: Request) {
  if (!(await authorize(request))) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  if (!body.name?.trim()) return Response.json({ error: "invalid_payload" }, { status: 400 });
  await dismissSuggestedTheme(body.name);
  return new Response(null, { status: 204 });
}
