"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { Note } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { formatTime } from "@/lib/format";
import { useCategories } from "./CategoriesProvider";
import { KIND_ICONS } from "./KindIcon";
import { IconChevron } from "./icons";

export function NoteRow({ note }: { note: Note }) {
  const { m, locale } = useI18n();
  const { get, label } = useCategories();
  const processing = note.status === "processing";
  const Icon = KIND_ICONS[note.kind];
  const color = get(note.category)?.color ?? "var(--cat-other)";
  const openActions = note.actionItems.filter((a) => !note.doneActionItems.includes(a)).length;

  return (
    <Link href={`/notes/${note.id}`} className={`card flex items-center gap-3 px-4 py-3.5 hover:border-faint transition ${processing ? "pulse" : ""}`}>
      <span className="tint w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ "--c": color } as CSSProperties}>
        <Icon size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold leading-snug truncate">{note.title || (processing ? m.status.processing : m.common.untitled)}</div>
        <div className="text-xs text-muted mt-0.5 truncate">
          {label(note.category)} · {m.kinds[note.kind]} · {formatTime(note.capturedAt, locale)}
          {openActions > 0 ? ` · ${openActions} ☐` : ""}
          {note.pinned ? " · 📌" : ""}
          {note.status === "error" ? ` · ${m.status.error}` : ""}
        </div>
      </div>
      <IconChevron className="text-faint shrink-0" />
    </Link>
  );
}
