import { authorize, unauthorized } from "@/lib/auth";
import { countNotesByCategory, listCategories } from "@/lib/categories";

/** GET /api/categories — catégories avec nombre de notes. */
export async function GET(request: Request) {
  if (!(await authorize(request))) return unauthorized();
  const [cats, counts] = await Promise.all([listCategories(), countNotesByCategory()]);
  return Response.json(cats.map((c) => ({ ...c, count: counts[c.slug] ?? 0 })));
}
