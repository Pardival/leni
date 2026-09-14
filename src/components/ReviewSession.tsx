"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Card } from "@/db/schema";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/lib/format";
import { useDictation } from "@/lib/useDictation";
import { IconCheck, IconClose, IconMic } from "./icons";

type SessionCard = Omit<Card, "answer" | "explanation">;
type Result = { correct: boolean; score: number; feedback: string; missing: string[]; reference: string; explanation: string; due: string };

export function ReviewSession({ sourceId, title }: { sourceId: string; title: string }) {
  const { m, locale } = useI18n();
  const router = useRouter();
  const [cards, setCards] = useState<SessionCard[] | null>(null);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [checking, setChecking] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [mastery, setMastery] = useState<number | null>(null);
  const startedAt = useRef(0);
  const dictation = useDictation(locale, setAnswer);

  useEffect(() => {
    fetch(`/api/sources/${sourceId}/session`)
      .then((r) => r.json())
      .then((c: SessionCard[]) => setCards(c))
      .catch(() => setCards([]));
  }, [sourceId]);

  useEffect(() => {
    startedAt.current = Date.now();
  }, [i, cards]);

  const card = cards?.[i] ?? null;
  const total = cards?.length ?? 0;
  const done = !cards ? false : i >= total;

  useEffect(() => {
    if (done && total > 0) {
      fetch(`/api/sources/${sourceId}`)
        .then((r) => r.json())
        .then((d: { stats: { mastery: number } }) => setMastery(d.stats.mastery))
        .catch(() => undefined);
    }
  }, [done, total, sourceId]);

  async function check() {
    if (!card || checking) return;
    if (card.format === "quiz" && picked == null) return;
    if (card.format !== "quiz" && !answer.trim()) return;
    if (dictation.listening) dictation.stop();
    setChecking(true);
    try {
      const res = await fetch(`/api/cards/${card.id}/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(card.format === "quiz" ? { optionIndex: picked, elapsedMs: Date.now() - startedAt.current } : { answerText: answer.trim(), elapsedMs: Date.now() - startedAt.current }),
      });
      if (!res.ok) throw new Error(await res.text());
      const r = (await res.json()) as Result;
      setResult(r);
      setResults((x) => [...x, r]);
    } catch {
      setResult({ correct: false, score: 0, feedback: m.learn.error, missing: [], reference: "", explanation: "", due: "" });
    } finally {
      setChecking(false);
    }
  }

  function next() {
    setI((x) => x + 1);
    setAnswer("");
    setPicked(null);
    setResult(null);
    setFlagged(false);
    startedAt.current = Date.now();
  }

  async function flag() {
    if (!card) return;
    await fetch(`/api/cards/${card.id}/flag`, { method: "POST" });
    setFlagged(true);
  }

  const verdict = result ? (result.score >= 0.9 ? "correct" : result.score >= 0.7 ? "partial" : "wrong") : null;
  const verdictColor = verdict === "correct" ? "var(--ok)" : verdict === "partial" ? "#b45309" : "var(--danger)";
  const correctCount = results.filter((r) => r.correct).length;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg text-ink overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Haut */}
        <div className="flex items-center gap-3">
          <Link href={`/learn/${sourceId}`} className="btn btn-ghost btn-icon" aria-label={m.common.back}>
            <IconClose />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted truncate">{title}</div>
            {total > 0 && <div className="text-sm font-semibold tabular-nums">{format(m.learn.session.progress, { done: Math.min(i + (result ? 1 : 0), total), total })}</div>}
          </div>
          {total > 0 && !done && (
            <div className="w-28 h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${((i + (result ? 1 : 0)) / total) * 100}%`, background: "#5b2fd1" }} />
            </div>
          )}
        </div>

        {/* Corps */}
        <div className="flex-1 flex flex-col justify-center gap-5 py-8">
          {!cards && <p className="text-muted pulse text-center">{m.learn.session.loading}</p>}
          {cards && total === 0 && (
            <div className="card p-8 text-center space-y-4">
              <p className="text-muted">{m.learn.session.empty}</p>
              <Link href={`/learn/${sourceId}`} className="btn">
                {m.learn.session.backToCourse}
              </Link>
            </div>
          )}

          {card && !done && (
            <div className="space-y-5 up" key={card.id}>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#5b2fd1" }}>
                  {m.learn.session[card.format]}
                </div>
                <h2 className="text-[1.5rem] font-bold leading-snug">{card.prompt}</h2>
              </div>

              {card.format === "quiz" ? (
                <div className="space-y-2">
                  {card.options.map((o, k) => {
                    const isPicked = picked === k;
                    const isRight = result && result.reference === o;
                    const style = result
                      ? isRight
                        ? { borderColor: "var(--ok)", background: "color-mix(in oklab, var(--ok) 14%, var(--surface))" }
                        : isPicked
                          ? { borderColor: "var(--danger)", background: "color-mix(in oklab, var(--danger) 12%, var(--surface))" }
                          : {}
                      : isPicked
                        ? { borderColor: "var(--ink)" }
                        : {};
                    return (
                      <button key={k} type="button" className="card w-full text-left px-4 py-3.5 text-[15px] font-medium transition" style={style} onClick={() => !result && setPicked(k)} disabled={Boolean(result)}>
                        {o}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    id="review-answer"
                    className="input min-h-32 text-[15px]"
                    placeholder={m.learn.session.answerPlaceholder}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={Boolean(result) || checking}
                  />
                  {dictation.supported && !result && (
                    <button type="button" className={`btn ${dictation.listening ? "btn-primary" : ""}`} onClick={() => (dictation.listening ? dictation.stop() : dictation.start(answer))} disabled={checking}>
                      <IconMic size={18} />
                      {dictation.listening ? m.learn.session.stop : m.learn.session.dictate}
                    </button>
                  )}
                </div>
              )}

              {result && (
                <div className="card p-4 space-y-3" style={{ borderColor: `color-mix(in oklab, ${verdictColor} 40%, var(--border))` }}>
                  <div className="flex items-center gap-2 font-bold" style={{ color: verdictColor }}>
                    {verdict === "correct" ? <IconCheck size={16} /> : null}
                    {verdict === "correct" ? m.learn.session.correct : verdict === "partial" ? m.learn.session.partial : m.learn.session.wrong}
                    <span className="ml-auto text-xs font-semibold text-muted tabular-nums">{Math.round(result.score * 100)} %</span>
                  </div>
                  {result.feedback && <p className="text-[15px] text-ink-2">{result.feedback}</p>}
                  {card.format !== "quiz" && result.reference && (
                    <p className="text-sm">
                      <span className="font-semibold">{m.learn.session.reference} : </span>
                      {result.reference}
                    </p>
                  )}
                  {result.missing.length > 0 && (
                    <p className="text-sm text-muted">
                      <span className="font-semibold">{m.learn.session.missing} : </span>
                      {result.missing.join(" · ")}
                    </p>
                  )}
                  {result.explanation && <p className="text-sm text-muted">{result.explanation}</p>}
                  {result.due && <p className="text-xs text-muted">{format(m.learn.session.nextDue, { when: formatDate(result.due, locale) })}</p>}
                  <button type="button" className="text-xs text-muted underline underline-offset-4" onClick={flag} disabled={flagged}>
                    {flagged ? m.learn.session.flagged : m.learn.session.flag}
                  </button>
                </div>
              )}
            </div>
          )}

          {done && total > 0 && (
            <div className="card p-8 text-center space-y-4 up">
              <h2 className="text-2xl font-bold">{m.learn.session.doneTitle}</h2>
              <p className="text-lg">{format(m.learn.session.doneSummary, { correct: correctCount, total })}</p>
              {mastery != null && <p className="text-muted">{format(m.learn.session.masteryNow, { value: mastery })}</p>}
              {mastery != null && mastery >= 80 && <p className="font-semibold" style={{ color: "#5b2fd1" }}>{m.learn.session.milestone}</p>}
              <div className="flex justify-center gap-2 pt-2">
                <Link href={`/learn/${sourceId}`} className="btn" onClick={() => router.refresh()}>
                  {m.learn.session.backToCourse}
                </Link>
                <button type="button" className="btn btn-dark" onClick={() => location.reload()}>
                  {m.learn.session.again}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bas */}
        {card && !done && (
          <div className="flex justify-end">
            {result ? (
              <button type="button" className="btn btn-dark" onClick={next}>
                {i + 1 >= total ? m.learn.session.finish : m.learn.session.next}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={check} disabled={checking || (card.format === "quiz" ? picked == null : !answer.trim())}>
                {checking ? m.learn.session.checking : m.learn.session.check}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
