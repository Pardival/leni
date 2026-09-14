"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties } from "react";
import { KINDS, type Kind, type Note } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { appleMapsUrl, formatDateTime } from "@/lib/format";
import { useCategories } from "./CategoriesProvider";
import { NoteContent } from "./NoteContent";
import { IconArchive, IconBack, IconCalendar, IconCheck, IconEdit, IconMap, IconRefresh, IconStar, IconTrash } from "./icons";

export function NoteEditor({ note }: { note: Note }) {
  const { m, locale } = useI18n();
  const { categories, get, label } = useCategories();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, startTransition] = useTransition();
  const [reprocessing, setReprocessing] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [doneLocal, setDoneLocal] = useState<string[]>(note.doneActionItems);

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [summary, setSummary] = useState(note.summary);
  const [category, setCategory] = useState(note.category);
  const [kind, setKind] = useState<Kind>(note.kind);
  const [tags, setTags] = useState(note.tags.join(", "));
  const [actions, setActions] = useState(note.actionItems.join("\n"));
  const [placeName, setPlaceName] = useState(note.placeName ?? "");
  const [dueDate, setDueDate] = useState(note.dueDate ?? "");

  const color = get(note.category)?.color ?? "var(--cat-other)";
  const processing = note.status === "processing";

  async function patch(body: Record<string, unknown>, refresh = true) {
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    if (refresh) startTransition(() => router.refresh());
  }

  async function save() {
    await patch({
      title: title.trim(),
      content: content.trim(),
      summary: summary.trim(),
      category,
      kind,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      actionItems: actions.split("\n").map((a) => a.trim()).filter(Boolean),
      placeName: placeName.trim() || null,
      dueDate: dueDate.trim() || null,
    });
    setEditing(false);
  }

  async function toggleAction(a: string) {
    const next = doneLocal.includes(a) ? doneLocal.filter((x) => x !== a) : [...doneLocal, a];
    setDoneLocal(next);
    await patch({ doneActionItems: next }, false);
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

  return (
    <article className="-mx-5 sm:mx-0">
      {/* Bandeau teinté */}
      <header className="tint rounded-b-[28px] sm:rounded-[28px] px-5 sm:px-8 pt-3 pb-6 space-y-5" style={{ "--c": color } as CSSProperties}>
        <div className="flex items-center justify-between">
          <Link href="/" className="w-10 h-10 rounded-full bg-white/70 dark:bg-black/25 flex items-center justify-center" aria-label={m.common.back}>
            <IconBack />
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-white/70 dark:bg-black/25 flex items-center justify-center"
              onClick={() => patch({ pinned: !note.pinned })}
              aria-label={note.pinned ? m.note.unpin : m.note.pin}
              title={note.pinned ? m.note.unpin : m.note.pin}
            >
              <IconStar style={note.pinned ? { fill: "currentColor" } : undefined} />
            </button>
          </div>
        </div>
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-white/75 dark:bg-black/25">{label(note.category)}</span>
            <span className="px-2.5 py-1 rounded-full bg-white/75 dark:bg-black/25">{m.kinds[note.kind]}</span>
            <span className="ml-auto font-medium opacity-80">{formatDateTime(note.capturedAt, locale)}</span>
          </div>
          {editing ? (
            <input className="input text-xl font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} />
          ) : (
            <h1 className="text-[1.75rem] sm:text-3xl font-bold leading-[1.12]">{note.title || m.common.untitled}</h1>
          )}
          {processing && <p className="text-sm font-medium pulse">{m.status.processing}</p>}
          {note.status === "error" && (
            <p className="text-sm font-medium" title={note.error ?? ""}>
              {m.status.error}
            </p>
          )}
        </div>
      </header>

      {/* Corps */}
      <div className="px-5 sm:px-8 pt-6 space-y-6">
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
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {label(c.slug)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{m.note.kind}</label>
                <select className="input" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {m.kinds[k]}
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
              <button className="btn btn-dark" onClick={save} disabled={busy}>
                {m.common.save}
              </button>
            </div>
          </div>
        ) : (
          <>
            <NoteContent text={note.content} className="prose-note" />

            {note.actionItems.length > 0 && (
              <section className="space-y-2">
                <h2 className="label">{m.note.todo}</h2>
                <div className="card divide-y divide-border-2">
                  {note.actionItems.map((a) => {
                    const done = doneLocal.includes(a);
                    return (
                      <div key={a} className="flex items-center gap-3 px-4 py-3">
                        <button type="button" className="checkbox" data-checked={done} onClick={() => toggleAction(a)} aria-label={a}>
                          {done && <IconCheck />}
                        </button>
                        <span className={`text-[15px] font-medium ${done ? "line-through text-muted" : ""}`}>{a}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {(note.tags.length > 0 || note.placeName || note.latitude != null || note.dueDate) && (
              <div className="flex flex-wrap gap-2">
                {note.tags.map((t) => (
                  <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="chip">
                    #{t}
                  </Link>
                ))}
                {(note.placeName || note.latitude != null) && (
                  <a
                    className="chip"
                    href={note.latitude != null && note.longitude != null ? appleMapsUrl(note.latitude, note.longitude, note.placeName) : undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconMap />
                    {note.placeName ?? m.note.openMap}
                  </a>
                )}
                {note.dueDate && (
                  <span className="chip">
                    <IconCalendar />
                    {note.dueDate}
                  </span>
                )}
              </div>
            )}

            {(note.entities.people.length > 0 || note.entities.projects.length > 0) && (
              <p className="text-sm text-muted">
                {note.entities.people.length > 0 && (
                  <span>
                    {m.note.people} : {note.entities.people.join(", ")}
                  </span>
                )}
                {note.entities.people.length > 0 && note.entities.projects.length > 0 && <span> · </span>}
                {note.entities.projects.length > 0 && (
                  <span>
                    {m.note.projects} : {note.entities.projects.join(", ")}
                  </span>
                )}
              </p>
            )}

            {note.audioPath && (
              <div className="card p-3">
                <audio controls preload="none" src={`/api/audio/${encodeURIComponent(note.audioPath)}`} className="w-full" />
              </div>
            )}

            <div className="space-y-3">
              <button type="button" className="text-sm text-muted underline underline-offset-4" onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? m.note.hideRaw : m.note.showRaw}
              </button>
              {showRaw && (
                <div className="space-y-3 text-sm text-muted">
                  <p className="whitespace-pre-wrap">{note.rawText}</p>
                  {note.analysis && (
                    <p className="italic">
                      <span className="font-semibold not-italic">{m.categoriesPage.analysis} : </span>
                      {note.analysis}
                    </p>
                  )}
                  {note.enrichedBy && <p className="font-mono text-xs">{note.enrichedBy}</p>}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Barre d'actions */}
      {!editing && (
        <div className="sticky bottom-24 sm:bottom-6 mt-8 mx-5 sm:mx-0">
          <div className="tabbar flex" style={{ display: "flex" }}>
            <button className="tab flex-1 px-4" data-active="true" onClick={() => setEditing(true)}>
              <IconEdit />
              {m.common.edit}
            </button>
            <button className="tab w-11" onClick={() => patch({ archived: !note.archived })} title={note.archived ? m.note.unarchive : m.note.archive} aria-label={m.note.archive}>
              <IconArchive />
            </button>
            <button className="tab w-11" onClick={reprocess} disabled={reprocessing || processing} title={m.note.reprocess} aria-label={m.note.reprocess}>
              <IconRefresh className={reprocessing ? "pulse" : ""} />
            </button>
            <button className="tab w-11 text-danger" onClick={remove} title={m.common.delete} aria-label={m.common.delete}>
              <IconTrash />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
