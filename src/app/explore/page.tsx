import Link from "next/link";
import { Constellation } from "@/components/Constellation";
import { CategoryLabel } from "@/components/CategoryLabel";
import { getI18n } from "@/i18n/server";
import { listCategories } from "@/lib/categories";
import { getStats } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { m } = await getI18n();
  const [stats, categories] = await Promise.all([getStats(), listCategories()]);
  const colorOf = new Map(categories.map((c) => [c.slug, c.color]));
  const max = Math.max(1, ...Object.values(stats.byCategory));

  const days = stats.lastDays;
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const graphNotes = stats.notes.slice(0, 120).map((n) => ({
    id: n.id,
    title: n.title || n.summary || n.content.slice(0, 40),
    color: colorOf.get(n.category) ?? "#8a8578",
    tags: n.tags,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight">{m.explore.title}</h1>
        <p className="text-muted mt-1">{m.explore.intro}</p>
        <Link href="/ask" className="btn btn-dark mt-3">
          ✦ {m.notes.askLeni}
        </Link>
      </div>

      {stats.total === 0 ? (
        <div className="card p-10 text-center text-muted">{m.explore.empty}</div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <section className="card p-5">
              <h2 className="section-title mb-4">{m.explore.byCategory}</h2>
              <ul className="space-y-2.5">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/?category=${c.slug}`} className="block group">
                      <div className="flex justify-between text-sm mb-1">
                        <CategoryLabel slug={c.slug} />
                        <span className="text-muted">{stats.byCategory[c.slug] ?? 0}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded-full group-hover:opacity-80 transition"
                          style={{ width: `${((stats.byCategory[c.slug] ?? 0) / max) * 100}%`, background: c.color }}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
                <li className="pt-1">
                  <Link href="/categories" className="text-xs text-muted underline">
                    {m.categoriesPage.manage}
                  </Link>
                </li>
              </ul>
            </section>

            <section className="card p-5">
              <h2 className="section-title mb-4">{m.explore.timeline}</h2>
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
              <h2 className="section-title mt-6 mb-3">{m.explore.topTags}</h2>
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
            <h2 className="section-title">{m.explore.graph}</h2>
            <p className="text-sm text-muted mb-3">{m.explore.graphHint}</p>
            <Constellation notes={graphNotes} />
          </section>
        </>
      )}
    </div>
  );
}
