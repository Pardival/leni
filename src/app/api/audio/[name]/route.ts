import type { NextRequest } from "next/server";
import { authorize, unauthorized } from "@/lib/auth";
import { audioMime, readAudio } from "@/lib/storage";

/** GET /api/audio/:name — sert un enregistrement conservé. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  if (!(await authorize(request))) return unauthorized();
  const { name } = await params;
  const data = await readAudio(name);
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "content-type": audioMime(name), "cache-control": "private, max-age=3600" },
  });
}
