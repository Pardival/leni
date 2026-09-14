import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { Card } from "@/db/schema";
import { getOpenAI } from "@/lib/ai/openai";
import { config } from "@/lib/config";

export type Grading = { score: number; feedback: string; missing: string[] };

const GradeSchema = z.object({
  score: z.number().describe("0 to 1: how well the answer matches the reference in substance (not wording). 1 = complete and correct, 0.7 = mostly right with a gap, 0.4 = partially right, 0 = wrong or empty."),
  feedback: z.string().describe("2-3 sentences to the student in their language: what was right, what was missing or wrong, stated plainly. Address them as 'tu' in French."),
  missing: z.array(z.string()).describe("Key elements of the reference answer absent from the student's answer. Empty if none."),
});

/** Corrige une réponse libre (dictée ou tapée) par rapport à la réponse de référence. */
export async function gradeAnswer(card: Card, answer: string): Promise<Grading> {
  const openai = getOpenAI();
  if (!openai) return { score: 0.5, feedback: "Mode mock : correction indisponible.", missing: [] };
  const completion = await openai.chat.completions.parse({
    model: config.openai.model,
    temperature: 0,
    messages: [
      { role: "system", content: "You grade a student's spoken or typed answer against a reference. Judge the substance, forgive dictation artifacts and informal phrasing. Be fair, specific and encouraging without inflating the score." },
      { role: "user", content: `Question (${card.format}): ${card.prompt}\n\nReference answer: ${card.answer}\nExplanation: ${card.explanation}\n\nStudent answer: ${answer || "(empty)"}` },
    ],
    response_format: zodResponseFormat(GradeSchema, "grading"),
  });
  const p = completion.choices[0]?.message.parsed;
  if (!p) throw new Error("grading failed");
  return { score: Math.max(0, Math.min(1, p.score)), feedback: p.feedback, missing: p.missing };
}
