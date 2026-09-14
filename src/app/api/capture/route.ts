import { after } from "next/server";
import { z } from "zod";
import { SOURCES } from "@/db/schema";
import { TranscriptionUnavailableError, transcribe } from "@/lib/ai/transcribe";
import { authorize, unauthorized } from "@/lib/auth";
import { saveAudio } from "@/lib/storage";
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

/**
 * Coordonnée envoyée par le Raccourci iOS. Raccourcis formate les nombres selon
 * la langue du téléphone ("48,8566" en français) et peut ajouter des espaces :
 * on nettoie, et toute valeur illisible devient null plutôt que de rejeter la note.
 */
const Numberish = z.preprocess((v) => {
  if (v == null || typeof v === "boolean") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).trim().replace(/\s/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}, z.number().nullable());

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
  /** "text" : réponse en texte lisible, idéale pour « Afficher une notification ». */
  format: z.enum(["json", "text"]).optional(),
});

/** Analyse LLM + Whisper : laisser le temps sur les plateformes serverless. */
export const maxDuration = 60;

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
    return respond(toPublic(processed ?? note), 201, fields.format);
  }

  after(() => processNote(note.id));
  return respond(toPublic(note), 202, fields.format);
}

function respond(payload: ReturnType<typeof toPublic>, status: number, format?: "json" | "text") {
  if (format !== "text") return Response.json(payload, { status });
  const line =
    payload.status === "ready"
      ? `✅ ${payload.title}\n${payload.category} · ${payload.tags.map((t) => `#${t}`).join(" ")}`
      : payload.status === "error"
        ? `⚠️ Note enregistrée, analyse échouée\n${payload.text.slice(0, 80)}`
        : `📝 Note enregistrée\n${payload.text.slice(0, 80)}`;
  return new Response(line, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
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
