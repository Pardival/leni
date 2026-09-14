import type { Lens, Note } from "@/db/schema";
import { config } from "@/lib/config";
import { getOpenAI } from "./openai";

const LENS_PROMPTS: Record<Lens, string> = {
  meaning:
    "Lens 'what it really says': restate the thought in two sentences, then name the underlying need, value or tension it reveals. Be precise and kind, no jargon.",
  perspective:
    "Lens 'another perspective': offer one genuinely different way to look at the same situation (another person's view, a longer time horizon, or a reframing). One short paragraph, then one sentence on what changes if that view is right.",
  traps:
    "Lens 'thinking traps': check the thought for common distortions (all-or-nothing, overgeneralisation, mind reading, catastrophising, self-imposed obligations, dismissing what went well). Name at most two that actually apply, in plain words of the note's language (never English jargon or technical labels), quote the words that show them, and propose a fairer wording. If none applies, say so.",
  next: "Lens 'and now?': propose ONE small concrete action or ONE question to sit with, doable within the week. Explain in one sentence why this one.",
  question: "Answer the user's own question about their note, honestly and briefly, staying within what the note says.",
};

const SYSTEM = `You are Leni, a thoughtful reading companion for someone's personal reflections.
Rules: write in the language of the note; address the person as "tu" in French; 60 to 140 words; no lists unless asked; never diagnose, never moralise, never pretend to be a therapist. Only if the note clearly expresses distress (not ordinary doubt or a small conflict), add one gentle sentence that talking to someone close or a professional could help; otherwise do not mention it.`;

/** Ajoute une lecture à une note selon une lentille. Retourne null sans clé OpenAI. */
export async function deepenNote(note: Note, lens: Lens, question?: string | null): Promise<{ content: string; model: string } | null> {
  const openai = getOpenAI();
  if (!openai) return null;
  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    temperature: 0.5,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${LENS_PROMPTS[lens]}${lens === "question" && question ? `\n\nUser question: ${question}` : ""}\n\nNote (${note.capturedAt.slice(0, 10)}, ${note.kind}):\n${note.content}${note.analysis ? `\n\n(Leni's earlier reading: ${note.analysis})` : ""}`,
      },
    ],
  });
  const content = completion.choices[0]?.message.content?.trim();
  return content ? { content, model: config.openai.model } : null;
}
