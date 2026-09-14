import en from "./messages/en";
import fr from "./messages/fr";
import type { Messages } from "./types";

/**
 * Registre des langues. Ajouter une langue :
 *   1. créer `messages/<code>.ts` (copier `en.ts`, traduire),
 *   2. l'importer et l'ajouter ci‑dessous.
 */
export const MESSAGES = {
  fr,
  en,
} as const satisfies Record<string, Messages>;

export type Locale = keyof typeof MESSAGES;
export const LOCALES = Object.keys(MESSAGES) as Locale[];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "leni_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && value in MESSAGES;
}

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

/** Choisit la meilleure langue à partir d'un en‑tête Accept-Language. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const candidates = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]!.trim().toLowerCase().split("-")[0]!)
    .filter(Boolean);
  for (const c of candidates) if (isLocale(c)) return c;
  return DEFAULT_LOCALE;
}

/** Interpolation minimale : "{count} note(s)" → "3 note(s)". */
export function format(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}
