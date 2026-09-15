"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { IconMic } from "./icons";

/** La seule action primaire de l'accueil : ouvrir la capture. */
export function CaptureHero() {
  const { m } = useI18n();
  return (
    <Link
      href="/capture"
      prefetch={true}
      className="up flex items-center gap-4 p-5 rounded-[22px] text-white"
      style={{ "--i": 1, background: "linear-gradient(135deg, #ff7a55 0%, #f4532d 55%, #e0401d 100%)", boxShadow: "var(--shadow-accent)" } as React.CSSProperties}
    >
      <div className="flex-1 min-w-0">
        <div className="display text-xl font-bold leading-tight">{m.notes.captureTitle}</div>
        <div className="text-sm font-medium opacity-90 mt-1">{m.notes.captureHint}</div>
      </div>
      <span className="breathe w-14 h-14 rounded-full bg-white text-accent flex items-center justify-center shrink-0 shadow-lg">
        <IconMic size={24} />
      </span>
    </Link>
  );
}
