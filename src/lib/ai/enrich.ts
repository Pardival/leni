import { zodResponseFormat } from "openai/helpers/zod";
import { config } from "@/lib/config";
import { mockEnrich } from "./mock";
import { getOpenAI } from "./openai";
import { EnrichmentSchema, type Enrichment } from "./schema";

export type EnrichInput = {
  rawText: string;
  capturedAt: string;
  /** Indice de langue fourni par le client (Raccourci), facultatif. */
  languageHint?: string | null;
  /** Coordonnées GPS, facultatives, utiles pour contextualiser `place_name`. */
  latitude?: number | null;
  longitude?: number | null;
};

export type EnrichResult = { enrichment: Enrichment; enrichedBy: string };

const SYSTEM_PROMPT = `You are Leni, a careful personal note assistant.
You receive a raw note that was dictated or typed quickly, often with dictation artifacts, missing punctuation and spelling mistakes.
Your job is to structure it so the person can find it later, without ever changing what they meant.

Rules:
- Detect the note's language and answer every text field in THAT language (the note may be French, English or another language).
- "content" is the note rewritten cleanly: fix spelling, punctuation, obvious dictation errors. Keep first person, keep tone, keep every idea. Never add ideas, never summarize in this field.
- "title" is short and specific (max 8 words). No trailing period.
- "summary" is one sentence, max 140 characters.
- "category": idea = a creative or product idea; task = something concrete to do; project = about an ongoing project (novel, app, work...); reflection = thinking about oneself or life; journal = what happened today, how the person feels; reference = a link, a book, a recipe, an address...; other = none of the above.
- "tags": 3 to 6, lowercase, single words or short kebab-case, useful for retrieval. Include the project name if any.
- "action_items": only concrete actions the person says they want to do. Imperative form. Empty array if none.
- "place_name": the place explicitly mentioned in the note if any; otherwise, if coordinates are provided, the city or neighbourhood they correspond to (short name); else null.
- "due_date": only if the note mentions a date or deadline. Resolve relative dates ("tomorrow", "next Saturday") against captured_at_human (it gives the weekday): "next <weekday>" is the first such weekday strictly after the capture day. Format YYYY-MM-DD. Else null.
- Be conservative: when unsure, prefer "other", empty arrays and null.`;

/**
 * Enrichit une note. Utilise OpenAI si une clé est configurée, sinon le mock.
 * Lève une erreur si l'appel OpenAI échoue (l'appelant décide quoi faire).
 */
export async function enrich(input: EnrichInput): Promise<EnrichResult> {
  const openai = getOpenAI();
  if (!openai) return { enrichment: mockEnrich(input.rawText), enrichedBy: "mock" };

  const capturedAtHuman = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date(input.capturedAt));

  const userPayload = {
    captured_at: input.capturedAt,
    // Le jour de la semaine est indispensable pour résoudre "samedi prochain".
    captured_at_human: capturedAtHuman,
    language_hint: input.languageHint ?? null,
    coordinates:
      input.latitude != null && input.longitude != null
        ? { latitude: input.latitude, longitude: input.longitude }
        : null,
    raw_note: input.rawText,
  };

  const completion = await openai.chat.completions.parse({
    model: config.openai.model,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(userPayload, null, 2) },
    ],
    response_format: zodResponseFormat(EnrichmentSchema, "note_enrichment"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    const refusal = completion.choices[0]?.message.refusal;
    throw new Error(refusal ? `LLM refusal: ${refusal}` : "LLM returned no structured output");
  }
  return { enrichment: EnrichmentSchema.parse(parsed), enrichedBy: config.openai.model };
}
