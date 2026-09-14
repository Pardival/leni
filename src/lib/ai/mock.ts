import type { Category, Sentiment } from "@/db/schema";
import type { Enrichment } from "./schema";

/**
 * Enrichissement sans LLM : heuristiques simples, déterministes et locales.
 * Sert de mode dégradé quand aucune clé OpenAI n'est configurée, et de
 * référence pour tester l'interface sans coût.
 */

const STOPWORDS: Record<string, Set<string>> = {
  fr: new Set(
    "le la les un une des du de et ou mais donc or ni car que qui quoi dont où je tu il elle on nous vous ils elles me te se lui leur mon ma mes ton ta tes son sa ses notre votre leurs ce cet cette ces ça cela ceci est sont était étaient être avoir ai as a avons avez ont fait faire dans sur sous avec sans pour par en au aux à y ne pas plus moins très trop aussi comme si alors quand puis bien tout tous toute toutes rien peut faut veux voudrais vais va".split(
      " ",
    ),
  ),
  en: new Set(
    "the a an and or but so nor for yet of in on at to from by with without about into over under is are was were be been being have has had do does did i you he she it we they me him her us them my your his its our their this that these those there here what which who whom whose when where why how not no yes very too also as if then than just can could should would will want need got get".split(
      " ",
    ),
  ),
};

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  task: ["faut", "acheter", "appeler", "envoyer", "penser à", "todo", "à faire", "rappel", "need to", "must", "buy", "call", "send", "remember to", "task", "deadline"],
  idea: ["idée", "et si", "je pourrais", "on pourrait", "concept", "idea", "what if", "could", "imagine"],
  project: ["projet", "roman", "app", "application", "livre", "chapitre", "personnage", "project", "novel", "book", "chapter", "character", "feature"],
  reflection: ["je pense", "je me demande", "réflexion", "pourquoi", "je crois", "i think", "i wonder", "reflection", "why", "i believe", "feel like"],
  journal: ["aujourd'hui", "ce matin", "ce soir", "hier", "journée", "today", "this morning", "tonight", "yesterday", "my day"],
  reference: ["lien", "site", "livre", "article", "recette", "adresse", "http", "www", "link", "website", "article", "recipe", "address"],
  other: [],
};

const NEGATIVE = ["pas bien", "nul", "triste", "fatigué", "stress", "angoiss", "peur", "colère", "négati", "difficile", "problème", "bad", "sad", "tired", "stress", "anxious", "afraid", "angry", "negative", "hard", "problem"];
const POSITIVE = ["super", "génial", "content", "heureux", "bien", "cool", "merci", "réussi", "fier", "great", "awesome", "happy", "good", "thanks", "proud", "love"];

export function detectLanguage(text: string): string {
  const words = tokenize(text);
  if (words.length === 0) return "und";
  let best = "und";
  let bestScore = 0;
  for (const [lang, stops] of Object.entries(STOPWORDS)) {
    const score = words.filter((w) => stops.has(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  return best;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, " ")
    .split(/[^\p{L}\p{N}-]+/u)
    .filter(Boolean);
}

function cleanText(raw: string): string {
  let t = raw.trim().replace(/\s+/g, " ");
  if (!t) return t;
  t = t[0]!.toUpperCase() + t.slice(1);
  if (!/[.!?…]$/.test(t)) t += ".";
  return t;
}

function makeTitle(text: string): string {
  const firstSentence = text.split(/(?<=[.!?…])\s/)[0] ?? text;
  const words = firstSentence.replace(/[.!?…]+$/, "").split(" ");
  const title = words.slice(0, 8).join(" ");
  return words.length > 8 ? `${title}…` : title;
}

function pickCategory(text: string): Category {
  const lower = text.toLowerCase();
  let best: Category = "other";
  let bestScore = 0;
  for (const [cat, keys] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    const score = keys.reduce((n, k) => n + (lower.includes(k) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best;
}

function pickTags(text: string, lang: string): string[] {
  const stops = STOPWORDS[lang] ?? new Set<string>();
  const freq = new Map<string, number>();
  for (const w of tokenize(text)) {
    if (w.length < 4 || stops.has(w) || /^\d+$/.test(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([w]) => w);
}

function pickSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  const neg = NEGATIVE.filter((k) => lower.includes(k)).length;
  const pos = POSITIVE.filter((k) => lower.includes(k)).length;
  if (neg > pos) return "negative";
  if (pos > neg) return "positive";
  return "neutral";
}

export function mockEnrich(rawText: string): Enrichment {
  const content = cleanText(rawText);
  const language = detectLanguage(rawText);
  return {
    title: makeTitle(content),
    content,
    summary: content.length > 140 ? `${content.slice(0, 137)}…` : content,
    category: pickCategory(rawText),
    tags: pickTags(rawText, language),
    language,
    action_items: [],
    entities: { people: [], places: [], projects: [] },
    place_name: null,
    sentiment: pickSentiment(rawText),
    due_date: null,
  };
}
