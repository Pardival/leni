"use client";

import { useEffect } from "react";

/**
 * Coupe le zoom par pincement sur les écrans tactiles.
 *
 * Le viewport (`maximumScale: 1`, `userScalable: false`) et `touch-action`
 * suffisent à Android et à l'app installée ; Safari iOS, lui, garde son
 * pincement propre au navigateur, qui ne s'annule qu'en JavaScript : les
 * événements `gesture*` de WebKit, et le second doigt posé (`touches`,
 * `scale`) pour les versions qui ne les émettent pas.
 *
 * Rien n'est posé sur un pointeur fin (souris, trackpad) : le zoom du
 * navigateur reste intact sur ordinateur. Un seul doigt n'est jamais
 * intercepté, donc appuis, défilement et sélection de texte ne changent pas.
 */
export function NoZoom() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const stop = (e: Event) => e.preventDefault();
    /** Deux doigts posés, ou une échelle qui bouge : c'est un pincement. */
    const stopPinch = (e: TouchEvent & { scale?: number }) => {
      if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault();
    };

    // Pincement Safari iOS (événements propres à WebKit).
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    document.addEventListener("gestureend", stop, { passive: false });
    // Filet de sécurité : couper le geste dès le second doigt, puis pendant.
    document.addEventListener("touchstart", stopPinch, { passive: false });
    document.addEventListener("touchmove", stopPinch, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("gestureend", stop);
      document.removeEventListener("touchstart", stopPinch);
      document.removeEventListener("touchmove", stopPinch);
    };
  }, []);

  return null;
}
