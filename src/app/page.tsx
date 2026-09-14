import { Suspense } from "react";
import { KINDS, type Kind, type Note } from "@/db/schema";
import { AutoRefresh } from "@/components/AutoRefresh";
import { FiltersBar } from "@/components/FiltersBar";
import { NoteCard } from "@/components/NoteCard";
import { getI18n } from "@/i18n/server";
import { format } from "@/i18n";
import { dayKey, dayLabel } from "@/lib/format";
import { listNotes } from "@/lib/notes";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Search = { q?: string; category?: string; kind?: string; tag?: string; archived?: string };

export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { m, locale } = await getI18n();
  const category = sp.category?.trim() || undefined;
  const kind = KINDS.includes(sp.kind as Kind) ? (sp.kind as Kind) : undefined;
  const archived = sp.archived === "true";

  const [notes, all] = await Promise.all([
    listNotes({ q: sp.q, category, kind, tag: sp.tag, archived }),
    listNotes({ archived }),
  ]);

  const counts: Record<string, number> = {};
  const tagCounts = new Map<string, number>();
  for (const n of all) {
    counts[n.category] = (counts[n.category] ?? 0) + 1;
    for (const t of n.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([t]) => t);

  const groups = groupByDay(notes);
  const processing = notes.some((n) => n.status === "processing");

  return (
    <div className="space-y-6">
      <AutoRefresh active={processing} />
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{m.notes.title}</h1>
          <p className="text-sm text-muted mt-0.5">{format(m.notes.count, { count: notes.length })}</p>
        </div>
      </div>

      <Suspense>
        <FiltersBar tags={topTags} counts={counts} />
      </Suspense>

      {all.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-medium">{m.notes.empty}</p>
          <p className="text-muted mt-1">{m.notes.emptyHint}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/capture" className="btn btn-primary">
              {m.nav.capture}
            </Link>
            <Link href="/setup" className="btn">
              {m.nav.setup}
            </Link>
          </div>
        </div>
      ) : notes.length === 0 ? (
        <div className="card p-10 text-center text-muted">{m.notes.noResults}</div>
      ) : (
        <div className="space-y-8">
          {groups.map(([day, items]) => (
            <section key={day}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 first-letter:uppercase">
                {dayLabel(day, locale, m.common)}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDay(notes: Note[]): [string, Note[]][] {
  const map = new Map<string, Note[]>();
  for (const n of notes) {
    const k = dayKey(n.capturedAt);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(n);
  }
  return [...map.entries()];
}
