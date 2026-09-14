import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { Note } from "@/db/schema";
import { DEFAULT_LOCALE } from "@/i18n";
import { config } from "@/lib/config";
import { searchNotes } from "@/lib/embeddings";
import { getOpenAI } from "./openai";

export type AskTurn = { role: "user" | "assistant"; content: string };
export type AskSource = { id: string; title: string; capturedAt: string; category: string; score: number };
export type AskResult = { answer: string; sources: AskSource[] };

const AnswerSchema = z.object({
  answer: z.string().describe("The answer, in the user's language, 2-8 sentences or a short list. Cite notes inline as [1], [2] using the given numbers. Say plainly when the notes contain nothing relevant."),
  used: z.array(z.number()).describe("Numbers of the notes actually used."),
});

const SYSTEM = `You are Leni, the user's personal notes assistant. You answer ONLY from the notes provided, which the user dictated over time.
- Answer in the language of the question (French or English).
- Be concrete: quote dates, names, decisions and open actions found in the notes. Cite each fact inline with the note number in brackets, e.g. [2].
- If the notes do not contain the answer, say so in one sentence and suggest what to note next time. Never invent.
- Keep it short: 2 to 8 sentences, or a short list.`;

/** Répond à une question à partir des notes les plus proches (recherche par sens + LLM). */
export async function askLeni(question: string, history: AskTurn[] = []): Promise<AskResult> {
  const openai = getOpenAI();
  const hits = await searchNotes(question, 8);
  if (!openai) {
    return {
      answer: hits.length ? "Mode mock : voici les notes les plus proches de ta question." : "Mode mock : aucune empreinte de sens disponible (clé OpenAI absente).",
      sources: hits.map((h, i) => toSource(h.note, h.score, i)),
    };
  }
  const context = hits
    .map((h, i) => `[${i + 1}] (${h.note.capturedAt.slice(0, 10)} · ${h.note.category} · ${h.note.kind}) ${h.note.title}\n${h.note.content}${h.note.actionItems.length ? `\nActions: ${h.note.actionItems.join("; ")}` : ""}`)
    .join("\n\n");

  const completion = await openai.chat.completions.parse({
    model: config.openai.model,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM },
      ...history.slice(-6).map((t) => ({ role: t.role, content: t.content })),
      { role: "user", content: `Notes (numbered):\n\n${context || "(no matching notes)"}\n\nUser language: ${DEFAULT_LOCALE}.\nQuestion: ${question}` },
    ],
    response_format: zodResponseFormat(AnswerSchema, "leni_answer"),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) throw new Error("no answer");
  const used = new Set(parsed.used);
  return {
    answer: parsed.answer,
    sources: hits.map((h, i) => toSource(h.note, h.score, i)).filter((s, i) => used.size === 0 || used.has(i + 1)),
  };
}

function toSource(n: Note, score: number, i: number): AskSource & { n: number } {
  return { n: i + 1, id: n.id, title: n.title || n.summary || n.content.slice(0, 60), capturedAt: n.capturedAt, category: n.category, score };
}
