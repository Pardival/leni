"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LENSES, type Insight, type Lens } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { formatDateTime } from "@/lib/format";
import { IconClose } from "./icons";

type Props = { noteId: string; insights: Insight[]; canDeepen: boolean; emphasize: boolean };

/** « Approfondir » : lentilles de lecture ajoutées sous la note. */
export function Insights({ noteId, insights, canDeepen, emphasize }: Props) {
  const { m, locale } = useI18n();
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState<Lens | null>(null);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function deepen(lens: Lens) {
    if (busy) return;
    if (!canDeepen) return setError(m.insights.unavailable);
    setBusy(lens);
    setError(null);
    try {
      const res = await fetch(`/api/notes/${noteId}/insights`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lens, question: lens === "question" ? question : undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      setQuestion("");
      start(() => router.refresh());
    } catch {
      setError(m.insights.error);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/insights/${id}`, { method: "DELETE" });
    start(() => router.refresh());
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="label">{m.insights.title}</h2>
        {emphasize && insights.length === 0 && <p className="text-sm text-muted">{m.insights.intro}</p>}
      </div>

      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((i) => (
            <div key={i.id} className="card p-4 space-y-2" style={{ borderColor: "color-mix(in oklab, var(--ok) 30%, var(--border))" }}>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="font-semibold text-ink">{i.lens === "question" && i.question ? i.question : m.insights.lenses[i.lens]}</span>
                <span>·</span>
                <span>{formatDateTime(i.createdAt, locale)}</span>
                <button type="button" className="ml-auto btn btn-ghost btn-icon !min-h-0 !w-8 !h-8" onClick={() => remove(i.id)} aria-label={m.insights.delete} title={m.insights.delete}>
                  <IconClose size={14} />
                </button>
              </div>
              <p className="text-[15px] leading-relaxed text-ink-2 whitespace-pre-wrap">{i.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {LENSES.filter((l) => l !== "question").map((l) => (
          <button key={l} type="button" className={`chip ${busy === l ? "pulse" : ""}`} onClick={() => deepen(l)} disabled={busy !== null}>
            {busy === l ? m.insights.working : m.insights.lenses[l]}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) deepen("question");
        }}
      >
        <input className="input" placeholder={m.insights.questionPlaceholder} value={question} onChange={(e) => setQuestion(e.target.value)} disabled={busy !== null} />
        <button className="btn shrink-0" disabled={busy !== null || !question.trim()}>
          {busy === "question" ? m.insights.working : m.insights.ask}
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
