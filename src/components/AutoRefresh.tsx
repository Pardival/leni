"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Tant qu'une note est en cours d'analyse, rafraîchit la page côté serveur
 * toutes les `intervalMs` millisecondes pour afficher le résultat.
 */
export function AutoRefresh({ active, intervalMs = 2500 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);
  return null;
}
