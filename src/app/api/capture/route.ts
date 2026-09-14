import { after } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { SOURCES } from "@/db/schema";
import { TranscriptionUnavailableError, transcribe } from "@/lib/ai/transcribe";
import { authorize, unauthorized } from "@/lib/auth";
import { audioDirPath } from "@/lib/config";
import { createNote, processNote } from "@/lib/notes";

/**
 * POST /api/capture — point d'entrée unique pour capturer une note.
 *
 * Accepte :
 *  - JSON      : { text, lat?, lng?, source?, captured_at?, language? }
 *  - multipart : champ `audio` (fichier) ou `text`, + mêmes champs optionnels
 *
 * Répond immédiatement avec la note en statut "processing" ; l'enrichissement
 * tourne ensuite en arrière-plan (`after`).
 */

const Numberish = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "string" ? Number(v) : v),
  z.number().finite().nullable(),
);

const CaptureFields = z.object({
  text: z.string().trim().optional(),
  lat: Numberish.optional(),
  lng: Numberish.optional(),
  latitude: Numberish.optional(),
  longitude: Numberish.optional(),
  source: z.enum(SOURCES).optional(),
  captured_at: z.string().optional(),
  language: z.string().trim().min(2).max(8).optional(),
  /** Si "true", la réponse attend la fin de l'analyse (utile pour le Raccourci). */
  wait: z.preprocess((v) => v === true || v === "true" || v === "1", z.boolean()).optional(),
});

export async function POST(request: Request) {
  if (!(await authorize(request))) return unauthorized();

  const contentType = request.headers.get("content-type") ?? "";
  let fields: z.infer<typeof CaptureFields>;
  let audio: File | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const raw: Record<string, unknown> = {};
      for (const [k, v] of form.entries()) {
        if (v instanceof File) {
          if (k === "audio" || k === "file") audio = v;
        } else raw[k] = v;
      }
      fields = CaptureFields.parse(raw);
    } else if (contentType.includes("application/json")) {
      fields = CaptureFields.parse(await request.json());
    } else {
      // Texte brut (ex: `curl --data-binary`) : on prend le corps tel quel.
      fields = CaptureFields.parse({ text: await request.text() });
    }
  } catch (err) {
    return Response.json({ error: "invalid_payload", detail: String(err) }, { status: 400 });
  }

  let rawText = fields.text ?? "";
  let audioPath: string | null = null;

  if (audio && audio.size > 0) {
    try {
      audioPath = await saveAudio(audio);
      rawText = await transcribe(audio, fields.language ?? null);
    } catch (err) {
      if (err instanceof TranscriptionUnavailableError) {
        return Response.json({ error: "transcription_unavailable", detail: err.message }, { status: 503 });
      }
      console.error("[leni] transcription failed:", err);
      return Response.json({ error: "transcription_failed", detail: String(err) }, { status: 502 });
    }
  }

  if (!rawText.trim()) {
    return Response.json({ error: "empty_note" }, { status: 400 });
  }

  const note = await createNote({
    rawText: rawText.trim(),
    source: fields.source ?? "api",
    capturedAt: fields.captured_at ?? null,
    latitude: fields.lat ?? fields.latitude ?? null,
    longitude: fields.lng ?? fields.longitude ?? null,
    languageHint: fields.language ?? null,
    audioPath,
  });

  if (fields.wait) {
    const processed = await processNote(note.id);
    return Response.json(toPublic(processed ?? note), { status: 201 });
  }

  after(() => processNote(note.id));
  return Response.json(toPublic(note), { status: 202 });
}

async function saveAudio(file: File): Promise<string> {
  await fs.mkdir(audioDirPath(), { recursive: true });
  const ext = guessExtension(file);
  const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const full = path.join(audioDirPath(), name);
  await fs.writeFile(full, Buffer.from(await file.arrayBuffer()));
  return name;
}

function guessExtension(file: File): string {
  const fromName = path.extname(file.name || "");
  if (fromName) return fromName.toLowerCase();
  const type = file.type.toLowerCase();
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return ".m4a";
  if (type.includes("webm")) return ".webm";
  if (type.includes("wav")) return ".wav";
  if (type.includes("ogg")) return ".ogg";
  if (type.includes("mpeg") || type.includes("mp3")) return ".mp3";
  return ".bin";
}

/** Réponse compacte, lisible dans une notification iOS. */
function toPublic(note: Awaited<ReturnType<typeof createNote>>) {
  return {
    id: note.id,
    status: note.status,
    title: note.title,
    summary: note.summary,
    category: note.category,
    tags: note.tags,
    language: note.language,
    text: note.content,
    url: `/notes/${note.id}`,
  };
}
