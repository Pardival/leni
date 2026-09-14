"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";

export function CopyField({ value, secret = false }: { value: string; secret?: boolean }) {
  const { m } = useI18n();
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(!secret);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponible (http non sécurisé) : l'utilisateur sélectionne à la main */
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <code
        className="input font-mono text-sm truncate cursor-text select-all"
        onClick={() => setReveal(true)}
        title={reveal ? value : undefined}
      >
        {reveal ? value : "•".repeat(Math.min(value.length, 32))}
      </code>
      <button type="button" className="btn shrink-0" onClick={copy}>
        {copied ? m.common.copied : m.common.copy}
      </button>
    </div>
  );
}
