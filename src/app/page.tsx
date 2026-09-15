import Link from "next/link";
import { Suspense } from "react";
import HomeSkeleton from "./loading";
import { KINDS, type Kind, type Note } from "@/db/schema";
import { CourseCard } from "@/components/CourseCard";
import { CaptureHero } from "@/components/CaptureHero";
import { FiltersBar } from "@/components/FiltersBar";
import { NoteRow } from "@/components/NoteRow";
import { OpenActions } from "@/components/OpenActions";
import { ThemeTiles } from "@/components/ThemeTiles";
import { IconFlame } from "@/components/icons";
import { format } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { config } from "@/lib/config";
import { dayKey, dayLabel } from "@/lib/format";
import { listSources } from "@/lib/learn/sources";
import { getStreak, listNotes, listOpenActions } from "@/lib/notes";

export const dynamic = "force-dynamic";

type Search = { q?: string; category?: string; kind?: string; tag?: string; archived?: string };

export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { m, locale } = await getI18n();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: config.timeZone }).format(new Date()));
  const greetingKey = hour < 12 ? "greetingMorning" : hour < 18 ? "greetingDay" : "greetingEvening";
  const greeting = config.userName ? format(m.notes[greetingKey], { name: config.userName }) : m.notes.title;
  const today = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: config.timeZone }).format(new Date());
  const filtering = Boolean(sp.q || sp.category || sp.kind || sp.tag || sp.archived === "true");

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-sm text-muted first-letter:uppercase">{today}</p>
          <h1 className="up text-[1.75rem] font-bold leading-tight">{greeting}</h1>
        </div>
        <Suspense>
          <StreakChip />
        </Suspense>
      </header>
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent sp={sp} filtering={filtering} />
      </Suspense>
    </div>
  );
}

async function StreakChip() {
  const { m } = await getI18n();
  const streak = await getStreak();
  if (streak <= 0) return null;
  return (
    <span className="chip text-ink gap-1.5" title={m.notes.streak}>
      <IconFlame size={16} className="text-accent" />
      {format(m.notes.streak, { count: streak })}
    </span>
  );
}

async function HomeContent({ sp, filtering }: { sp: Search; filtering: boolean }) {
  const { m, locale } = await getI18n();
  const category = sp.category?.trim() || undefined;
  const kind = KINDS.includes(sp.kind as Kind) ? (sp.kind as Kind) : undefined;
  const archived = sp.archived === "true";

  // Une seule lecture des notes actives ; filtres, actions et série en dérivent.
  const [all, courses] = await Promise.all([listNotes({ archived: false }), listSources()]);
  const notes = filtering
    ? archived
      ? await listNotes({ q: sp.q, category, kind, tag: sp.tag, archived })
      : filterNotes(all, { q: sp.q, category, kind, tag: sp.tag })
    : all;
  const openActions = await listOpenActions(5, all);
  const dueTotal = courses.reduce((n, c) => n + c.due, 0);

  const counts: Record<string, number> = {};
  const tagCounts = new Map<string, number>();
  for (const n of all) {
    counts[n.category] = (counts[n.category] ?? 0) + 1;
    for (const t of n.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);
  const groups = groupByDay(notes);

  return (
    <>
      {!filtering && (
        <>
          <CaptureHero />

          <section className="up space-y-3" style={{ "--i": 2 } as React.CSSProperties}>
            <div className="flex items-baseline justify-between">
              <h2 className="section-title">{m.notes.toResume}</h2>
              {openActions.length > 0 && (
                <Link href="/?kind=task" className="text-sm font-semibold text-accent">
                  {m.notes.seeAll}
                </Link>
              )}
            </div>
            <OpenActions actions={openActions} />
          </section>

          {courses.length > 0 && (
            <section className="up space-y-3" style={{ "--i": 3 } as React.CSSProperties}>
              <div className="flex items-baseline justify-between">
                <h2 className="section-title">{m.notes.learnTitle}</h2>
                <Link href="/learn" className="text-sm font-semibold text-accent">
                  {m.notes.learnAll}
                </Link>
              </div>
              {dueTotal > 0 && <p className="text-sm text-muted">{format(m.learn.dueToday, { count: dueTotal })}</p>}
              <div className="space-y-2">
                {courses
                  .slice()
                  .sort((a, b) => b.due - a.due)
                  .slice(0, 3)
                  .map((c) => (
                    <CourseCard key={c.id} course={c} compact />
                  ))}
              </div>
            </section>
          )}

          <section className="up space-y-3" style={{ "--i": 4 } as React.CSSProperties}>
            <h2 className="section-title">{m.notes.themes}</h2>
            <ThemeTiles counts={counts} />
          </section>
        </>
      )}

      <section className="up space-y-4" style={{ "--i": 5 } as React.CSSProperties}>
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">{filtering ? m.notes.title : m.notes.allNotes}</h2>
          <span className="text-sm text-muted">{format(m.notes.count, { count: notes.length })}</span>
        </div>
        <Suspense>
          <FiltersBar tags={topTags} />
        </Suspense>

        {all.length === 0 && !filtering ? (
          <div className="card p-10 text-center">
            <p className="text-lg font-medium">{m.notes.empty}</p>
            <p className="text-muted mt-1">{m.notes.emptyHint}</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="card p-10 text-center text-muted">{m.notes.noResults}</div>
        ) : (
          <div className="space-y-6">
            {groups.map(([day, items]) => (
              <div key={day} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted first-letter:uppercase">
                  {dayLabel(day, locale, m.common, config.timeZone)}
                </h3>
                <div className="space-y-2">
                  {items.map((n) => (
                    <NoteRow key={n.id} note={n} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function filterNotes(list: Note[], f: { q?: string; category?: string; kind?: Kind; tag?: string }): Note[] {
  const q = f.q?.trim().toLowerCase();
  return list.filter(
    (n) =>
      (!f.category || n.category === f.category) &&
      (!f.kind || n.kind === f.kind) &&
      (!f.tag || n.tags.includes(f.tag)) &&
      (!q || [n.title, n.content, n.rawText, n.summary, n.placeName ?? "", n.tags.join(" ")].some((t) => t.toLowerCase().includes(q))),
  );
}

function groupByDay(notes: Note[]): [string, Note[]][] {
  const map = new Map<string, Note[]>();
  for (const n of notes) {
    const k = dayKey(n.capturedAt, config.timeZone);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(n);
  }
  return [...map.entries()];
}
