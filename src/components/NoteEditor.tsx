"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CATEGORIES, type Category, type Note } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { appleMapsUrl, formatDateTime } from "@/lib/format";
import { CategoryBadge } from "./CategoryBadge";

export function NoteEditor({ note }: { note: Note }) {
  const { m, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, startTransition] = useTransition();
  const [reprocessing, setReprocessing] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [summary, setSummary] = useState(note.summary);
  const [category, setCategory] = useState<Category>(note.category);
  const [tags, setTags] = useState(note.tags.join(", "));
  const [actions, setActions] = useState(note.actionItems.join("\n"));
  const [placeName, setPlaceName] = useState(note.placeName ?? "");
  const [dueDate, setDueDate] = useState(note.dueDate ?? "");

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    startTransition(() => router.refresh());
  }

  async function save() {
    await patch({
      title: title.trim(),
      content: content.trim(),
      summary: summary.trim(),
      category,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      actionItems: actions.split("\n").map((a) => a.trim()).filter(Boolean),
      placeName: placeName.trim() || null,
      dueDate: dueDate.trim() || null,
    });
    setEditing(false);
  }

  async function reprocess() {
    setReprocessing(true);
    try {
      await fetch(`/api/notes/${note.id}/reprocess`, { method: "POST" });
      startTransition(() => router.refresh());
    } finally {
      setReprocessing(false);
    }
  }

  async function remove() {
    if (!confirm(m.common.confirmDelete)) return;
    await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  const processing = note.status === "processing";

  return (
    <article className="card p-5 sm:p-8 space-y-6">
      {/* En-tête */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <CategoryBadge category={note.category} />
          <span>·</span>
          <time dateTime={note.capturedAt}>{formatDateTime(note.capturedAt, locale)}</time>
          <span>·</span>
          <span>{m.sources[note.source]}</span>
          {note.language !== "und" && (
            <>
              <span>·</span>
              <span className="uppercase">{note.language}</span>
            </>
          )}
          {processing && <span className="text-accent pulse">{m.status.processing}</span>}
          {note.status === "error" && (
            <span className="text-danger" title={note.error ?? ""}>
              {m.status.error}
            </span>
          )}
        </div>

        {editing ? (
          <input className="input text-xl font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} />
        ) : (
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
            {note.title || m.common.untitled}
          </h1>
        )}
      </header>

      {/* Corps */}
      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="label">{m.note.content}</label>
            <textarea className="input min-h-48 prose-note" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div>
            <label className="label">{m.note.summary}</label>
            <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{m.note.category}</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {m.categories[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                {m.note.tags} <span className="font-normal normal-case tracking-normal">({m.note.tagsHint})</span>
              </label>
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div>
              <label className="label">{m.note.location}</label>
              <input className="input" value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
            </div>
            <div>
              <label className="label">{m.note.dueDate}</label>
              <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">{m.note.actionItems}</label>
            <textarea className="input min-h-24" value={actions} onChange={(e) => setActions(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={busy}>
              {m.common.cancel}
            </button>
            <button className="btn btn-primary" onClick={save} disabled={busy}>
              {m.common.save}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {note.summary && note.summary !== note.content && (
            <p className="text-muted italic border-l-2 border-accent/50 pl-3">{note.summary}</p>
          )}
          <p className="prose-note">{note.content}</p>

          {note.actionItems.length > 0 && (
            <section>
              <h2 className="label">{m.note.actionItems}</h2>
              <ul className="space-y-1.5">
                {note.actionItems.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent">☐</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {note.tags.length > 0 && (
              <div>
                <h2 className="label">{m.note.tags}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {note.tags.map((t) => (
                    <a key={t} href={`/?tag=${encodeURIComponent(t)}`} className="chip">
                      #{t}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {(note.placeName || note.latitude != null) && (
              <div>
                <h2 className="label">{m.note.location}</h2>
                <p>
                  {note.placeName && <span>📍 {note.placeName} </span>}
                  {note.latitude != null && note.longitude != null && (
                    <a
                      className="text-accent underline"
                      href={appleMapsUrl(note.latitude, note.longitude, note.placeName)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {m.note.openMap}
                    </a>
                  )}
                </p>
              </div>
            )}
            {note.dueDate && (
              <div>
                <h2 className="label">{m.note.dueDate}</h2>
                <p>📅 {note.dueDate}</p>
              </div>
            )}
            {(note.entities.people.length > 0 || note.entities.places.length > 0 || note.entities.projects.length > 0) && (
              <div>
                <h2 className="label">{m.note.entities}</h2>
                <dl className="space-y-0.5">
                  {note.entities.people.length > 0 && (
                    <div className="flex gap-2">
                      <dt className="text-muted">{m.note.people}:</dt>
                      <dd>{note.entities.people.join(", ")}</dd>
                    </div>
                  )}
                  {note.entities.places.length > 0 && (
                    <div className="flex gap-2">
                      <dt className="text-muted">{m.note.places}:</dt>
                      <dd>{note.entities.places.join(", ")}</dd>
                    </div>
                  )}
                  {note.entities.projects.length > 0 && (
                    <div className="flex gap-2">
                      <dt className="text-muted">{m.note.projects}:</dt>
                      <dd>{note.entities.projects.join(", ")}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
            <div>
              <h2 className="label">{m.note.sentiment}</h2>
              <p>{m.sentiments[note.sentiment]}</p>
            </div>
            {note.enrichedBy && (
              <div>
                <h2 className="label">{m.note.enrichedBy}</h2>
                <p className="font-mono text-xs">{note.enrichedBy}</p>
              </div>
            )}
          </div>

          {note.audioPath && (
            <section>
              <h2 className="label">{m.note.audio}</h2>
              <audio controls preload="none" src={`/api/audio/${encodeURIComponent(note.audioPath)}`} className="w-full" />
            </section>
          )}

          <section>
            <button className="text-xs text-muted underline" onClick={() => setShowRaw((v) => !v)}>
              {m.note.rawText}
            </button>
            {showRaw && <p className="mt-2 text-sm text-muted whitespace-pre-wrap font-mono">{note.rawText}</p>}
          </section>
        </div>
      )}

      {/* Actions */}
      {!editing && (
        <footer className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button className="btn" onClick={() => setEditing(true)}>
            {m.common.edit}
          </button>
          <button className="btn" onClick={reprocess} disabled={reprocessing || processing}>
            {reprocessing ? m.note.reprocessing : m.note.reprocess}
          </button>
          <button className="btn" onClick={() => patch({ pinned: !note.pinned })}>
            {note.pinned ? m.note.unpin : m.note.pin}
          </button>
          <button className="btn" onClick={() => patch({ archived: !note.archived })}>
            {note.archived ? m.note.unarchive : m.note.archive}
          </button>
          <button className="btn btn-danger ml-auto" onClick={remove}>
            {m.common.delete}
          </button>
        </footer>
      )}
    </article>
  );
}
