import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { CARD_FORMATS, type CardFormat, type Concept, type Document } from "@/db/schema";
import { getOpenAI } from "@/lib/ai/openai";
import { config } from "@/lib/config";

export type GeneratedCard = { conceptId: string; format: CardFormat; prompt: string; options: string[]; answer: string; explanation: string; verified: boolean };

const CardSchema = z.object({
  concept: z.string().describe("Exact concept name this card trains."),
  format: z.enum(CARD_FORMATS),
  prompt: z.string().describe("The question, exercise statement, or 'explain X' request, in the material's language."),
  options: z.array(z.string()).describe("Quiz only: 4 options, one correct, plausible distractors. Empty for other formats."),
  answer: z.string().describe("Quiz: the 0-based index of the correct option as a string. Open/exercise/explain: the reference answer, 1-4 sentences, complete but concise."),
  explanation: z.string().describe("Why this is the answer, referencing the material. 1-3 sentences."),
});
const BatchSchema = z.object({ cards: z.array(CardSchema) });

const VerifySchema = z.object({
  verdicts: z.array(z.object({ index: z.number(), ok: z.boolean(), reason: z.string() })),
});

const GEN_SYSTEM = `You write retrieval-practice cards for a student, grounded ONLY in the study document provided.
Quality bar (most generated cards fail it, so be strict): each card tests one clear idea; the answer is unambiguous and stated in the document; no trivia, no "which of these is NOT", no questions about the document's wording; distractors are plausible misconceptions; open questions require explaining or applying, not listing; exercises are small, solvable problems with a checkable result; "explain" cards ask to explain a concept to a friend. Write in the document's language.`;

const VERIFY_SYSTEM = `You are a strict reviewer of study cards. For each card, answer ok=true only if: the question is unambiguous; the reference answer is correct AND supported by the document; for quizzes exactly one option is correct and the answer index points to it; the card is not trivial. Otherwise ok=false with a short reason.`;

/**
 * Génère puis vérifie des cartes pour un lot de concepts. Les cartes refusées
 * par le second passage restent stockées mais non vérifiées (jamais servies).
 */
export async function generateCards(doc: Document, concepts: Concept[], perConcept = 3): Promise<GeneratedCard[]> {
  const openai = getOpenAI();
  if (!openai) return [];
  const context = documentContext(doc);
  const byName = new Map(concepts.map((c) => [c.name.toLowerCase(), c]));
  const out: GeneratedCard[] = [];

  for (let i = 0; i < concepts.length; i += 5) {
    const batch = concepts.slice(i, i + 5);
    const gen = await openai.chat.completions.parse({
      model: config.openai.model,
      temperature: 0.4,
      messages: [
        { role: "system", content: GEN_SYSTEM },
        {
          role: "user",
          content: `Study document:\n${context}\n\nConcepts to cover (${perConcept} cards each, mixing formats: at least one quiz and one open/explain per concept; add an exercise when the concept is procedural or quantitative):\n${batch.map((c) => `- ${c.name}: ${c.description}`).join("\n")}`,
        },
      ],
      response_format: zodResponseFormat(BatchSchema, "cards"),
    });
    const cardsRaw = gen.choices[0]?.message.parsed?.cards ?? [];
    const candidates = cardsRaw
      .map((c) => ({ ...c, concept: byName.get(c.concept.toLowerCase()) ?? closest(byName, c.concept) }))
      .filter((c) => c.concept && c.prompt.trim() && c.answer.trim())
      .filter((c) => c.format !== "quiz" || (c.options.length >= 3 && /^\d+$/.test(c.answer.trim()) && Number(c.answer) < c.options.length));
    if (candidates.length === 0) continue;

    const verify = await openai.chat.completions.parse({
      model: config.openai.model,
      temperature: 0,
      messages: [
        { role: "system", content: VERIFY_SYSTEM },
        {
          role: "user",
          content: `Study document:\n${context}\n\nCards:\n${candidates
            .map((c, idx) => `#${idx} [${c.format}] Q: ${c.prompt}${c.options.length ? `\nOptions: ${c.options.map((o, k) => `(${k}) ${o}`).join(" | ")}` : ""}\nA: ${c.answer}\nWhy: ${c.explanation}`)
            .join("\n\n")}`,
        },
      ],
      response_format: zodResponseFormat(VerifySchema, "verdicts"),
    });
    const okSet = new Set((verify.choices[0]?.message.parsed?.verdicts ?? []).filter((v) => v.ok).map((v) => v.index));
    candidates.forEach((c, idx) => {
      out.push({ conceptId: c.concept!.id, format: c.format, prompt: c.prompt.trim(), options: c.options, answer: c.answer.trim(), explanation: c.explanation.trim(), verified: okSet.has(idx) });
    });
  }
  return out;
}

function closest(byName: Map<string, Concept>, name: string): Concept | undefined {
  const n = name.toLowerCase();
  for (const [k, c] of byName) if (k.includes(n) || n.includes(k)) return c;
  return undefined;
}

export function documentContext(doc: Document): string {
  return [
    `# ${doc.title}`,
    doc.summary,
    ...doc.sections.map((s) => `## ${s.heading}\n${s.content}`),
    `Key points: ${doc.keyPoints.join(" | ")}`,
    `Glossary: ${doc.glossary.map((g) => `${g.term}: ${g.definition}`).join(" | ")}`,
  ].join("\n\n").slice(0, 60000);
}
