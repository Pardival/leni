import { z } from "zod";
import { KINDS, SENTIMENTS } from "@/db/schema";

/**
 * Ce que l'enrichissement doit produire pour chaque note.
 * L'ordre des champs compte : le modèle "réfléchit" dans `analysis` avant
 * de produire le reste.
 */
export const EnrichmentSchema = z.object({
  analysis: z
    .string()
    .describe(
      "2-3 sentences, in the note's language: what this note is really about, what the person wants to keep or do, and which existing theme (category) fits best and why.",
    ),
  title: z.string().describe("Short, specific title (max 8 words), in the note's language. No trailing period."),
  content: z
    .string()
    .describe(
      "The note rewritten to be pleasant to read later: remove hesitations, fillers, repetitions and self-corrections; fix grammar; organise into short paragraphs, or a list of lines starting with '- ' when there are several distinct points. Keep first person, keep every substantive idea, add nothing. Usually shorter than the original.",
    ),
  summary: z.string().describe("One sentence summary (max 140 chars), in the note's language."),
  kind: z.enum(KINDS).describe("Type of note: idea, task, reflection, journal, reference, or note (default)."),
  category_slug: z.string().describe("Slug of the existing theme that fits best."),
  ideal_theme: z
    .object({
      name: z.string().describe("1-2 words, capitalised, in the UI language given in the payload. Reuse an existing theme's exact name when it already names this area."),
      description: z.string().describe("One sentence in the UI language: what kind of notes belong here."),
    })
    .describe("The most specific recurring area of life this note belongs to (e.g. Pets, Garden, Children, Piano, a named project), regardless of the existing list. Always filled."),
  tags: z.array(z.string()).describe("3 to 6 lowercase tags, single words or short kebab-case, in the note's language."),
  language: z.string().describe("ISO 639-1 code of the note's language (fr, en, ...)."),
  action_items: z.array(z.string()).describe("Concrete things to do mentioned in the note, imperative form. Empty if none."),
  entities: z.object({
    people: z.array(z.string()),
    places: z.array(z.string()),
    projects: z.array(z.string()),
  }),
  place_name: z.string().nullable(),
  sentiment: z.enum(SENTIMENTS),
  due_date: z.string().nullable().describe("YYYY-MM-DD if the note mentions a date or deadline, else null."),
});

export type Enrichment = z.infer<typeof EnrichmentSchema>;

/** Réponse du contrôle de doublon avant création d'une catégorie. */
export const CategoryDedupSchema = z.object({
  reasoning: z.string(),
  existing_slug: z
    .string()
    .nullable()
    .describe("Slug of an existing category that means the same thing or would contain the proposed one. null if the proposal is genuinely distinct."),
});
