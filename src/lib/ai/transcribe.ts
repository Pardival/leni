import { config } from "@/lib/config";
import { getOpenAI } from "./openai";

export class TranscriptionUnavailableError extends Error {
  constructor() {
    super("Audio transcription requires OPENAI_API_KEY");
    this.name = "TranscriptionUnavailableError";
  }
}

/**
 * Transcrit un fichier audio via Whisper. `languageHint` (ISO 639-1) améliore
 * la précision quand on connaît la langue ; sinon Whisper détecte seul.
 */
export async function transcribe(file: File, languageHint?: string | null): Promise<string> {
  const openai = getOpenAI();
  if (!openai) throw new TranscriptionUnavailableError();

  const result = await openai.audio.transcriptions.create({
    file,
    model: config.openai.transcribeModel,
    language: languageHint && /^[a-z]{2}$/i.test(languageHint) ? languageHint.toLowerCase() : undefined,
    response_format: "json",
  });
  return result.text.trim();
}
