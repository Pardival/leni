import { after } from "next/server";
import { z } from "zod";
import { authorize, unauthorized } from "@/lib/auth";
import { createSource, listSources, processSource } from "@/lib/learn/sources";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!(await authorize(request))) return unauthorized();
  return Response.json(await listSources());
}

const Json = z.union([
  z.object({ url: z.string().url(), title: z.string().max(160).optional() }),
  z.object({ text: z.string().min(200).max(400_000), title: z.string().max(160).optional() }),
]);

/**
 * POST /api/sources — dépose une source à apprendre.
 *  - multipart : champ `file` (PDF), `title?`
 *  - JSON : { url } ou { text, title? }
 * Répond 202 avec la source ; synthèse et cartes tournent en arrière-plan.
 */
export async function POST(request: Request) {
  if (!(await authorize(request))) return unauthorized();
  try {
    const type = request.headers.get("content-type") ?? "";
    let source;
    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) return Response.json({ error: "file_required" }, { status: 400 });
      if (file.size > 25 * 1024 * 1024) return Response.json({ error: "file_too_large" }, { status: 413 });
      const title = typeof form.get("title") === "string" ? String(form.get("title")) : undefined;
      source = await createSource({ kind: "pdf", data: new Uint8Array(await file.arrayBuffer()), originalName: file.name, title });
    } else {
      const parsed = Json.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return Response.json({ error: "invalid_payload", detail: parsed.error.issues }, { status: 400 });
      source = "url" in parsed.data ? await createSource({ kind: "url", url: parsed.data.url, title: parsed.data.title }) : await createSource({ kind: "text", text: parsed.data.text, title: parsed.data.title });
    }
    after(() => processSource(source.id));
    const { text: _t, ...pub } = source;
    void _t;
    return Response.json(pub, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "too_little_text" ? 422 : 502;
    return Response.json({ error: message }, { status });
  }
}
