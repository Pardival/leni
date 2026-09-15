import { authorize, unauthorized } from "@/lib/auth";
import { getPulse } from "@/lib/pulse";

/**
 * GET /api/pulse — empreinte de l'état de la base (`{ v }`), interrogée par
 * l'interface pour se rafraîchir toute seule quand une note arrive par le
 * Raccourci iOS ou une autre application.
 */
export async function GET(request: Request) {
  if (!(await authorize(request))) return unauthorized();
  const v = await getPulse();
  return Response.json({ v }, { headers: { "cache-control": "no-store" } });
}
