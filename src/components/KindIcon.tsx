"use client";

import type { Kind } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { IconIdea, IconJournal, IconNote, IconReference, IconReflection, IconTask } from "./icons";

export const KIND_ICONS: Record<Kind, (p: { size?: number }) => React.ReactNode> = {
  idea: IconIdea,
  task: IconTask,
  reflection: IconReflection,
  journal: IconJournal,
  reference: IconReference,
  note: IconNote,
};

export function KindIcon({ kind, size = 16, withLabel = true }: { kind: Kind; size?: number; withLabel?: boolean }) {
  const { m } = useI18n();
  const Icon = KIND_ICONS[kind];
  return (
    <span className="inline-flex items-center gap-1" title={m.kinds[kind]}>
      <Icon size={size} />
      {withLabel && <span>{m.kinds[kind]}</span>}
    </span>
  );
}
