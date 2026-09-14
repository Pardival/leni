"use client";

import type { Kind } from "@/db/schema";
import { useI18n } from "@/i18n/client";

export const KIND_ICONS: Record<Kind, string> = {
  idea: "💡",
  task: "☑︎",
  reflection: "🤔",
  journal: "📓",
  reference: "🔖",
  note: "📝",
};

export function KindIcon({ kind, withLabel = true }: { kind: Kind; withLabel?: boolean }) {
  const { m } = useI18n();
  return (
    <span className="inline-flex items-center gap-1" title={m.kinds[kind]}>
      <span aria-hidden>{KIND_ICONS[kind]}</span>
      {withLabel && <span>{m.kinds[kind]}</span>}
    </span>
  );
}
