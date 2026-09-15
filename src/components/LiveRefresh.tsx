"use client";

import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

const DEFAULT_INTERVAL_MS = 3000;
const MAX_INTERVAL_MS = 30_000;

/** Écrans où un rafraîchissement n'apporte rien (ou gênerait) : on n'interroge pas. */
const isPaused = (pathname: string) =>
  pathname.startsWith("/login") || pathname.startsWith("/capture") || /^\/learn\/[^/]+\/review/.test(pathname);

/**
 * Rafraîchissement en direct : interroge `GET /api/pulse` tant que l'onglet
 * est visible et relance le rendu serveur (`router.refresh`) dès que
 * l'empreinte change — note reçue du Raccourci iOS ou d'une autre appli,
 * analyse terminée, source prête, thème émergé… Vérification immédiate au
 * retour sur l'onglet (visibilité, focus, retour de bfcache, reconnexion).
 * Rien n'est interrogé onglet caché ; en cas d'erreur le délai double
 * jusqu'à 30 s ; une session expirée (401) arrête tout.
 */
export function LiveRefresh({ intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const paused = isPaused(pathname);

  useEffect(() => {
    if (paused) return;
    let last: string | null = null;
    let delay = intervalMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inflight = false;
    let stopped = false;

    const schedule = () => {
      clearTimeout(timer);
      if (stopped || document.visibilityState !== "visible") return;
      timer = setTimeout(check, delay);
    };

    const check = async () => {
      if (inflight || stopped) return;
      inflight = true;
      try {
        const res = await fetch("/api/pulse", { cache: "no-store", headers: { accept: "application/json" } });
        if (res.status === 401) {
          stopped = true;
          return;
        }
        if (!res.ok) throw new Error(`pulse ${res.status}`);
        const { v } = (await res.json()) as { v: string };
        if (last !== null && v !== last) startTransition(() => router.refresh());
        last = v;
        delay = intervalMs;
      } catch {
        delay = Math.min(delay * 2, MAX_INTERVAL_MS);
      } finally {
        inflight = false;
        schedule();
      }
    };

    /** Retour au premier plan : vérification immédiate, puis reprise du rythme normal. */
    const wake = () => {
      if (document.visibilityState !== "visible") return clearTimeout(timer);
      delay = intervalMs;
      clearTimeout(timer);
      void check();
    };

    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener("online", wake);
    void check();

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener("online", wake);
    };
  }, [paused, intervalMs, router]);

  return null;
}
