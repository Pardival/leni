import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAI } from "@/lib/ai/openai";
import { config } from "@/lib/config";
import { chunkText } from "./extract";

const ChunkSummary = z.object({
  summary: z.string().describe("Faithful summary of this part, 150-300 words, in the source's language."),
  concepts: z.array(z.object({ name: z.string(), description: z.string() })).describe("Key notions introduced or developed in this part (3-8)."),
});

export const DocumentSchema = z.object({
  title: z.string().describe("A clear title for the course/document, in its language."),
  language: z.string().describe("ISO 639-1 code."),
  summary: z.string().describe("A complete, useful synthesis in 3-6 paragraphs (300-600 words): what the material teaches, how it is organised, the main results. Plain prose, no bullet points."),
  sections: z.array(z.object({ heading: z.string(), content: z.string() })).describe("The material's structure: 4-10 sections, each a heading plus a dense paragraph (80-200 words) with the essential content, definitions, formulas or examples."),
  key_points: z.array(z.string()).describe("8-15 things to remember, one sentence each."),
  glossary: z.array(z.object({ term: z.string(), definition: z.string() })).describe("10-25 terms with one-sentence definitions."),
  open_questions: z.array(z.string()).describe("3-6 questions the material raises or leaves open, good for reflection."),
  concepts: z.array(z.object({ name: z.string(), description: z.string() })).describe("8-20 distinct concepts to master, ordered as one would learn them. Short names (1-4 words). No duplicates or near-synonyms."),
});
export type SynthesizedDocument = z.infer<typeof DocumentSchema>;

const SYSTEM = `You are Leni, a rigorous study assistant. You turn course material into a synthesis a student can learn from, without inventing anything absent from the material. Write in the material's language. Prefer precision over generality: keep definitions, formulas, numbers and named examples.`;

/**
 * Synthèse d'une source : résumé par morceau (map) puis document final (reduce).
 * Lève une erreur sans clé OpenAI.
 */
export async function synthesize(text: string, hint?: { title?: string | null }): Promise<SynthesizedDocument> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OPENAI_API_KEY required");
  const chunks = chunkText(text, 14000);

  let material: string;
  if (chunks.length === 1) {
    material = chunks[0]!;
  } else {
    const parts: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const c = await openai.chat.completions.parse({
        model: config.openai.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Part ${i + 1}/${chunks.length} of the material. Summarise it faithfully and list its key notions.\n\n${chunks[i]}` },
        ],
        response_format: zodResponseFormat(ChunkSummary, "chunk_summary"),
      });
      const p = c.choices[0]?.message.parsed;
      if (p) parts.push(`## Part ${i + 1}\n${p.summary}\nNotions: ${p.concepts.map((k) => `${k.name} — ${k.description}`).join("; ")}`);
    }
    material = parts.join("\n\n");
  }

  const completion = await openai.chat.completions.parse({
    model: config.openai.model,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${hint?.title ? `Known title: ${hint.title}\n\n` : ""}Produce the study document from this material${chunks.length > 1 ? " (already summarised part by part)" : ""}:\n\n${material}`,
      },
    ],
    response_format: zodResponseFormat(DocumentSchema, "study_document"),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) throw new Error("synthesis failed");
  return parsed;
}
