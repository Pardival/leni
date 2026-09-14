import OpenAI from "openai";
import { config } from "@/lib/config";

let client: OpenAI | null = null;

/** Client OpenAI partagé, ou null si aucune clé n'est configurée. */
export function getOpenAI(): OpenAI | null {
  if (!config.openai.apiKey) return null;
  if (!client) client = new OpenAI({ apiKey: config.openai.apiKey });
  return client;
}
