import { z } from "zod";
import { CATEGORIES, SENTIMENTS } from "@/db/schema";

/**
 * Ce que l'enrichissement doit produire pour chaque note.
 * Utilisé à la fois pour contraindre le LLM (JSON schema) et valider sa sortie.
 */
export const EnrichmentSchema = z.object({
  title: z.string().describe("Short, specific title (max 8 words), in the note's language."),
  content: z
    .string()
    .describe(
      "The note rewritten cleanly: fix spelling, punctuation and dictation artifacts. Keep the same language, the same meaning and the same first-person voice. Do not add information.",
    ),
  summary: z.string().describe("One sentence summary (max 140 chars), in the note's language."),
  category: z.enum(CATEGORIES),
  tags: z.array(z.string()).describe("3 to 6 lowercase tags, single words or short kebab-case, in the note's language."),
  language: z.string().describe("ISO 639-1 code of the note's language (fr, en, ...)."),
  action_items: z.array(z.string()).describe("Concrete things to do mentioned in the note, imperative form. Empty if none."),
  entities: z.object({
    people: z.array(z.string()),
    places: z.array(z.string()),
    projects: z.array(z.string()),
  }),
  place_name: z
    .string()
    .nullable()
    .describe("A place explicitly mentioned as where the person is or what the note is about, else null."),
  sentiment: z.enum(SENTIMENTS),
  due_date: z
    .string()
    .nullable()
    .describe("ISO 8601 date (YYYY-MM-DD) if the note mentions a deadline or a specific date, resolved relative to captured_at. Else null."),
});

export type Enrichment = z.infer<typeof EnrichmentSchema>;
