import Link from "next/link";
import { CATEGORIES } from "@/db/schema";
import { Constellation } from "@/components/Constellation";
import { getI18n } from "@/i18n/server";
import { getStats } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { m } = await getI18n();
  const stats = await getStats();
  const max = Math.max(1, ...Object.values(stats.byCategory));

  const days = stats.lastDays;
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const graphNotes = stats.notes.slice(0, 120).map((n) => ({
    id: n.id,
    title: n.title || n.summary || n.content.slice(0, 40),
    category: n.category,
    tags: n.tags,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{m.explore.title}</h1>
        <p className="text-muted mt-1">{m.explore.intro}</p>
      </div>

      {stats.total === 0 ? (
        <div className="card p-10 text-center text-muted">{m.explore.empty}</div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <section className="card p-5">
              <h2 className="font-semibold mb-4">{m.explore.byCategory}</h2>
              <ul className="space-y-2.5">
                {CATEGORIES.map((c) => (
                  <li key={c}>
                    <Link href={`/?category=${c}`} className="block group">
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`cat cat-${c}`}>{m.categories[c]}</span>
                        <span className="text-muted">{stats.byCategory[c]}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full cat-${c} group-hover:opacity-80 transition`}
                          style={{ width: `${(stats.byCategory[c] / max) * 100}%`, background: "var(--c)" }}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <h2 className="font-semibold mb-4">{m.explore.timeline}</h2>
              <svg viewBox={`0 0 ${days.length * 10} 60`} className="w-full h-28" preserveAspectRatio="none">
                {days.map((d, i) => {
                  const h = (d.count / maxDay) * 54;
                  return (
                    <rect
                      key={d.key}
                      x={i * 10 + 1.5}
                      y={58 - h}
                      width={7}
                      height={Math.max(h, d.count ? 2 : 0.6)}
                      rx={1.5}
                      fill={d.count ? "var(--accent)" : "var(--border)"}
                    >
                      <title>{`${d.key}: ${d.count}`}</title>
                    </rect>
                  );
                })}
              </svg>
              <h2 className="font-semibold mt-6 mb-3">{m.explore.topTags}</h2>
              <div className="flex flex-wrap gap-1.5">
                {stats.topTags.map(([t, n]) => (
                  <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="chip">
                    #{t} <span className="opacity-60">{n}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section className="card p-5">
            <h2 className="font-semibold">{m.explore.graph}</h2>
            <p className="text-sm text-muted mb-3">{m.explore.graphHint}</p>
            <Constellation notes={graphNotes} />
          </section>
        </>
      )}
    </div>
  );
}
