import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseActions } from "@/components/CourseActions";
import { IconBack } from "@/components/icons";
import { format } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { getDocument, getSource, listConcepts, sourceStats } from "@/lib/learn/sources";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await getSource(id);
  if (!source) notFound();
  const { m } = await getI18n();
  const [doc, concepts, stats] = await Promise.all([getDocument(id), listConcepts(id), sourceStats(id)]);
  const processing = source.status !== "ready" && source.status !== "error";

  return (
    <article className="-mx-5 sm:mx-0 -mt-4 space-y-8">
      <header className="tint rounded-b-[28px] sm:rounded-[28px] px-5 sm:px-8 pt-3 pb-6 space-y-5" style={{ "--c": "#5b2fd1" } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <Link href="/learn" className="w-10 h-10 rounded-full bg-white/70 dark:bg-black/25 flex items-center justify-center" aria-label={m.common.back}>
            <IconBack />
          </Link>
          <CourseActions id={id} title={source.title} status={source.status} />
        </div>
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-white/75 dark:bg-black/25">{m.learn.kinds[source.kind]}</span>
            {source.pageCount ? <span className="px-2.5 py-1 rounded-full bg-white/75 dark:bg-black/25">{format(m.learn.pages, { count: source.pageCount })}</span> : null}
            <span className="px-2.5 py-1 rounded-full bg-white/75 dark:bg-black/25">{processing ? m.learn.status[source.status] : format(m.learn.cardsCount, { count: stats.verified })}</span>
          </div>
          <h1 className="text-[1.75rem] sm:text-3xl font-bold leading-[1.12]">{source.title}</h1>
          {source.status === "error" && <p className="text-sm font-medium">{m.learn.status.error} : {source.error}</p>}
          {processing && <p className="text-sm font-medium pulse">{m.learn.status[source.status]}</p>}
        </div>
        {source.status === "ready" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <span>{format(m.learn.mastery, { value: stats.mastery })}</span>
              <div className="flex-1 h-2 rounded-full bg-white/60 dark:bg-black/30 overflow-hidden">
                <div className="h-full rounded-full bg-current" style={{ width: `${stats.mastery}%` }} />
              </div>
            </div>
            {stats.due > 0 ? (
              <Link href={`/learn/${id}/review`} className="btn btn-dark">
                {format(m.learn.reviewN, { count: stats.due })}
              </Link>
            ) : (
              <p className="text-sm">{m.learn.nothingDue}</p>
            )}
          </div>
        )}
      </header>

      {doc && (
        <div className="px-5 sm:px-0 space-y-8">
          <section className="space-y-3">
            <h2 className="section-title">{m.learn.synthesis}</h2>
            <div className="space-y-3 prose-note">
              {doc.summary.split(/\n\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          {doc.sections.length > 0 && (
            <section className="space-y-4">
              {doc.sections.map((s, i) => (
                <div key={i} className="space-y-1.5">
                  <h3 className="font-semibold text-[1.05rem]">{s.heading}</h3>
                  <p className="text-[15px] leading-relaxed text-ink-2">{s.content}</p>
                </div>
              ))}
            </section>
          )}

          {doc.keyPoints.length > 0 && (
            <section className="space-y-2">
              <h2 className="label">{m.learn.keyPoints}</h2>
              <ul className="card divide-y divide-border-2">
                {doc.keyPoints.map((k, i) => (
                  <li key={i} className="px-4 py-3 text-[15px]">{k}</li>
                ))}
              </ul>
            </section>
          )}

          {concepts.length > 0 && (
            <section className="space-y-2">
              <h2 className="label">{m.learn.concepts}</h2>
              <div className="card divide-y divide-border-2">
                {concepts.map((c) => (
                  <div key={c.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[15px] font-semibold">{c.name}</span>
                      <span className="text-xs font-semibold text-muted tabular-nums">{Math.round(c.mastery)} %</span>
                    </div>
                    <p className="text-sm text-muted">{c.description}</p>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.mastery}%`, background: "#5b2fd1" }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {doc.glossary.length > 0 && (
            <section className="space-y-2">
              <h2 className="label">{m.learn.glossary}</h2>
              <dl className="card divide-y divide-border-2">
                {doc.glossary.map((g, i) => (
                  <div key={i} className="px-4 py-3">
                    <dt className="text-[15px] font-semibold">{g.term}</dt>
                    <dd className="text-sm text-muted mt-0.5">{g.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {doc.openQuestions.length > 0 && (
            <section className="space-y-2">
              <h2 className="label">{m.learn.openQuestions}</h2>
              <ul className="space-y-1.5 text-[15px] text-ink-2 pl-5 list-disc">
                {doc.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
