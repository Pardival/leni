import { zodResponseFormat } from "openai/helpers/zod";
import type { CategoryRow } from "@/db/schema";
import { DEFAULT_LOCALE, getMessages } from "@/i18n";
import { config } from "@/lib/config";
import { mockEnrich } from "./mock";
import { getOpenAI } from "./openai";
import { CategoryDedupSchema, EnrichmentSchema, type Enrichment } from "./schema";

export type EnrichInput = {
  rawText: string;
  capturedAt: string;
  /** Catégories existantes, pour que le modèle choisisse ou propose. */
  categories: CategoryRow[];
  /** Noms de thèmes déjà proposés sur d'autres notes, pour garder une graphie unique. */
  pendingThemes?: string[];
  /** Indice de langue fourni par le client (Raccourci), facultatif. */
  languageHint?: string | null;
  /** Coordonnées GPS, facultatives, utiles pour contextualiser `place_name`. */
  latitude?: number | null;
  longitude?: number | null;
};

export type EnrichResult = { enrichment: Enrichment; enrichedBy: string };

const UI_LANGUAGE_NAME: Record<string, string> = { fr: "French", en: "English" };

const SYSTEM_PROMPT = `You are Leni, a careful personal note assistant.
You receive a raw note that was dictated or typed quickly: it can ramble, hesitate, repeat itself, contain dictation artifacts and spelling mistakes.
Your job is to turn it into a note that is pleasant to read later and easy to find, without ever changing what the person meant.

Rules:
- Detect the note's language and answer every text field in THAT language (French, English or another).
- "analysis" first: say what the note is really about and what the person wants. Think about the best category here.
- "content" is a rewrite, not a transcript: drop fillers ("euh", "voilà", "du coup", "genre", "like", "you know"), hesitations, repetitions and self-corrections; fix grammar and punctuation; keep first person and the person's tone; keep every substantive idea and every detail that matters (names, numbers, dates); add nothing. If the note has several distinct points, use a list: one point per line starting with "- ". Otherwise one or two short paragraphs. Usually shorter than the original.
- "title": short and specific (max 8 words). No trailing period.
- "summary": one sentence, max 140 characters.
- "kind" is the TYPE of note: idea (a creative or product idea), task (something concrete to do), reflection (thinking about oneself or life), journal (what happened, how the person feels), reference (a link, a book, a recipe, an address, a fact to keep), note (anything else).
- Category is the THEME, the area of life the note belongs to. The payload lists the existing themes (slug, name, description): put the best-fitting one in "category_slug" (use "other" only when nothing relates).
- "ideal_theme" is independent of that list: name the most specific recurring area of life this note is about, as a person would label a section of their notebook (Pets, Garden, Children, Piano, Car, Spirituality, the name of a project...). If an existing theme already names exactly this area, reuse its exact name. 1-2 words, capitalised, in the UI language given in the payload, with a one-sentence description in that language. Themes that come back often are created automatically from this field, so be specific and consistent: the payload's "pending_theme_names" lists names already proposed on other notes; if one of them designates the same area, reuse it exactly (e.g. reuse "Potager" rather than inventing "Jardinage").
- "tags": 3 to 6, lowercase, single words or short kebab-case, useful for retrieval. Include the project name if any.
- "action_items": only concrete actions the person says they want to do. Imperative form. Empty array if none.
- "place_name": the place explicitly mentioned in the note if any; otherwise, if coordinates are provided, the city or neighbourhood they correspond to (short name); else null.
- "due_date": only if the note mentions a date or deadline. Resolve relative dates ("tomorrow", "next Saturday") against captured_at_human (it gives the weekday): "next <weekday>" is the first such weekday strictly after the capture day. Format YYYY-MM-DD. Else null.
- Be conservative: when unsure, prefer existing categories, empty arrays and null.`;

/**
 * Enrichit une note. Utilise OpenAI si une clé est configurée, sinon le mock.
 * Lève une erreur si l'appel OpenAI échoue (l'appelant décide quoi faire).
 */
export async function enrich(input: EnrichInput): Promise<EnrichResult> {
  const openai = getOpenAI();
  if (!openai) return { enrichment: mockEnrich(input.rawText), enrichedBy: "mock" };

  const capturedAtHuman = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: config.timeZone,
  }).format(new Date(input.capturedAt));

  const userPayload = {
    captured_at: input.capturedAt,
    // Le jour de la semaine est indispensable pour résoudre "samedi prochain".
    captured_at_human: capturedAtHuman,
    ui_language: UI_LANGUAGE_NAME[DEFAULT_LOCALE] ?? getMessages(DEFAULT_LOCALE).meta.name,
    language_hint: input.languageHint ?? null,
    coordinates:
      input.latitude != null && input.longitude != null
        ? { latitude: input.latitude, longitude: input.longitude }
        : null,
    existing_themes: input.categories.map((c) => ({ slug: c.slug, name: c.name, description: c.description })),
    pending_theme_names: input.pendingThemes ?? [],
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

/**
 * Second avis avant de créer une catégorie : le modèle compare la proposition
 * aux catégories existantes et renvoie le slug d'un équivalent, ou null.
 * Sans clé OpenAI, on ne crée jamais de catégorie (retourne "other").
 */
export async function dedupCategory(
  proposal: { name: string; description: string },
  existing: CategoryRow[],
): Promise<string | null | "create"> {
  const openai = getOpenAI();
  if (!openai) return "other";

  const completion = await openai.chat.completions.parse({
    model: config.openai.model,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You keep a personal note-taking app's list of themes (areas of life) small and non-redundant. Given a proposed new theme and the existing ones, decide whether an existing theme already covers it (synonym, translation, broader or narrower version of it). Be strict: only answer null when the proposal is a genuinely different area of life.",
      },
      { role: "user", content: JSON.stringify({ proposal, existing: existing.map((c) => ({ slug: c.slug, name: c.name, description: c.description })) }, null, 2) },
    ],
    response_format: zodResponseFormat(CategoryDedupSchema, "category_dedup"),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) return "create";
  const slug = parsed.existing_slug;
  if (slug && existing.some((c) => c.slug === slug)) return slug;
  return "create";
}
