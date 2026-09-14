import type { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { authorize, unauthorized } from "@/lib/auth";
import { audioDirPath } from "@/lib/config";

const MIME: Record<string, string> = {
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".webm": "audio/webm",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
};

/** GET /api/audio/:name — sert un enregistrement conservé dans AUDIO_DIR. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  if (!(await authorize(request))) return unauthorized();
  const { name } = await params;
  const safe = path.basename(name);
  if (safe !== name) return Response.json({ error: "not_found" }, { status: 404 });
  const full = path.join(audioDirPath(), safe);
  try {
    const data = await fs.readFile(full);
    const type = MIME[path.extname(safe).toLowerCase()] ?? "application/octet-stream";
    return new Response(new Uint8Array(data), { headers: { "content-type": type, "cache-control": "private, max-age=3600" } });
  } catch {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
}
