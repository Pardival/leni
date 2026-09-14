import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { config, isWebProtected } from "./config";

export const SESSION_COOKIE = "leni_session";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Valeur du cookie de session dérivée du mot de passe (pas de base utilisateur). */
export function sessionValue(): string | null {
  if (!config.appPassword) return null;
  return createHmac("sha256", config.appPassword).update("leni-session-v1").digest("hex");
}

export function checkPassword(candidate: string): boolean {
  return Boolean(config.appPassword) && safeEqual(candidate, config.appPassword!);
}

/** Vrai si la requête porte le token de capture (Raccourci iOS, scripts). */
export function hasCaptureToken(request: Request): boolean {
  if (!config.captureToken) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1]?.trim() ?? new URL(request.url).searchParams.get("token") ?? "";
  return token.length > 0 && safeEqual(token, config.captureToken);
}

/** Vrai si l'utilisateur web est connecté (ou si aucun mot de passe n'est requis). */
export async function hasWebSession(): Promise<boolean> {
  if (!isWebProtected()) return true;
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value ?? "";
  const expected = sessionValue();
  return Boolean(expected) && safeEqual(value, expected!);
}

/**
 * Vrai si la requête vient d'un navigateur sur la même origine que l'app
 * (l'interface web elle-même). Les scripts externes (curl, Raccourci) n'ont
 * pas ces en-têtes et doivent présenter le token.
 */
export function isSameOriginBrowserRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "same-origin") return true;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Autorise une requête API : token de capture, OU requête de l'interface web
 * (même origine + session valide quand APP_PASSWORD est défini).
 */
export async function authorize(request: Request): Promise<boolean> {
  if (hasCaptureToken(request)) return true;
  if (!isSameOriginBrowserRequest(request)) return false;
  return hasWebSession();
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
