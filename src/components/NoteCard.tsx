"use client";

import Link from "next/link";
import type { Note } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { formatTime } from "@/lib/format";
import { CategoryBadge } from "./CategoryBadge";
import { KindIcon } from "./KindIcon";

export function NoteCard({ note }: { note: Note }) {
  const { m, locale } = useI18n();
  const processing = note.status === "processing";
  const title = note.title || m.common.untitled;
  const body = note.summary || note.content;

  return (
    <Link
      href={`/notes/${note.id}`}
      className={`card block p-4 sm:p-5 hover:border-faint transition ${processing ? "pulse" : ""}`}
    >
      <div className="flex items-center gap-3 text-xs text-muted">
        <CategoryBadge slug={note.category} />
        <span>·</span>
        <KindIcon kind={note.kind} />
        <span>·</span>
        <time dateTime={note.capturedAt}>{formatTime(note.capturedAt, locale)}</time>
        {note.placeName && (
          <>
            <span>·</span>
            <span className="truncate">📍 {note.placeName}</span>
          </>
        )}
        {note.pinned && <span className="ml-auto">📌</span>}
        {note.status === "error" && <span className="ml-auto text-danger">{m.status.error}</span>}
        {processing && <span className="ml-auto text-accent">{m.status.processing}</span>}
      </div>
      <h3 className="mt-2 font-semibold text-[1.05rem] leading-snug tracking-tight">{title}</h3>
      <p className="mt-1 text-muted text-sm leading-relaxed line-clamp-3">{body}</p>
      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.slice(0, 6).map((t) => (
            <span key={t} className="chip">
              #{t}
            </span>
          ))}
        </div>
      )}
      {note.actionItems.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {note.actionItems.slice(0, 3).map((a, i) => (
            <li key={i} className="flex gap-2 text-ink/90">
              <span className="text-accent">☐</span>
              <span className="truncate">{a}</span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
