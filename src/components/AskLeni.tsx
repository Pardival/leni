"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import type { AskSource, AskTurn } from "@/lib/ai/ask";
import { formatDate } from "@/lib/format";
import { useCategories } from "./CategoriesProvider";
import { IconSearch } from "./icons";

type Exchange = { question: string; answer: string; sources: AskSource[] };

export function AskLeni({ canAsk }: { canAsk: boolean }) {
  const { m, locale } = useI18n();
  const { label } = useCategories();
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(q: string) {
    const value = q.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    setQuestion("");
    const history: AskTurn[] = exchanges.slice(-3).flatMap((e) => [
      { role: "user", content: e.question },
      { role: "assistant", content: e.answer },
    ]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: value, history }),
      });
      if (!res.ok) throw new Error(await res.text());
      const r = (await res.json()) as { answer: string; sources: AskSource[] };
      setExchanges((x) => [...x, { question: value, answer: r.answer, sources: r.sources }]);
    } catch {
      setError(m.ask.error);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="space-y-5">
      {!canAsk && <p className="card p-4 text-sm text-muted">{m.ask.mock}</p>}

      {exchanges.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {m.ask.examples.map((ex) => (
            <button key={ex} type="button" className="chip" onClick={() => ask(ex)} disabled={busy}>
              {ex}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {exchanges.map((e, i) => (
          <div key={i} className="space-y-2 up">
            <p className="text-sm font-semibold text-muted">{e.question}</p>
            <div className="card p-4 sm:p-5 space-y-3">
              <p className="text-[15px] leading-relaxed text-ink-2 whitespace-pre-wrap">{e.answer}</p>
              {e.sources.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border-2">
                  <div className="label mb-1">{m.ask.sources}</div>
                  {e.sources.map((s, j) => (
                    <Link key={s.id} href={`/notes/${s.id}`} className="flex items-baseline gap-2 text-sm hover:underline underline-offset-4">
                      <span className="text-xs font-bold text-accent shrink-0">[{j + 1}]</span>
                      <span className="font-medium truncate">{s.title}</span>
                      <span className="text-xs text-muted shrink-0">
                        {label(s.category)} · {formatDate(s.capturedAt, locale)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-muted pulse">{m.ask.thinking}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <form
        className="sticky bottom-24 sm:bottom-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <div className="relative flex-1">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            ref={inputRef}
            id="ask-question"
            className="input pl-10 shadow-[var(--shadow-2)]"
            placeholder={m.ask.placeholder}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={busy}
            autoFocus
          />
        </div>
        <button className="btn btn-dark shrink-0" disabled={busy || !question.trim()}>
          {m.ask.send}
        </button>
      </form>
    </div>
  );
}
