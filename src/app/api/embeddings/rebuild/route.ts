import { authorize, unauthorized } from "@/lib/auth";
import { rebuildEmbeddings } from "@/lib/embeddings";

export const maxDuration = 60;

/** POST /api/embeddings/rebuild — vectorise les notes sans empreinte à jour. */
export async function POST(request: Request) {
  if (!(await authorize(request))) return unauthorized();
  return Response.json(await rebuildEmbeddings());
}
