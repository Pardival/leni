import { createHash } from "node:crypto";
import { config } from "@/lib/config";
import { getOpenAI } from "./openai";

export const EMBEDDING_DIMENSIONS = 512;

/** Vectorise un ou plusieurs textes. Retourne null sans clé OpenAI (mode mock). */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const openai = getOpenAI();
  if (!openai || texts.length === 0) return null;
  const res = await openai.embeddings.create({
    model: config.openai.embeddingModel,
    input: texts.map((t) => t.slice(0, 8000)),
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedText(text: string): Promise<number[] | null> {
  const r = await embedTexts([text]);
  return r?.[0] ?? null;
}

/** Similarité cosinus, vecteurs OpenAI déjà normalisés → produit scalaire suffit, on reste robuste. */
export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function contentHash(text: string): string {
  return createHash("sha1").update(text).digest("hex");
}
