"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES } from "@/db/schema";
import { useI18n } from "@/i18n/client";

type Props = {
  tags: string[];
  counts: Record<string, number>;
};

export function FiltersBar({ tags, counts }: Props) {
  const { m } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const tag = params.get("tag") ?? "";
  const archived = params.get("archived") === "true";
  const [search, setSearch] = useState(q);
  // Resynchronise le champ quand l'URL change (ex: "Effacer les filtres").
  const [prevQ, setPrevQ] = useState(q);
  if (prevQ !== q) {
    setPrevQ(q);
    setSearch(q);
  }

  // Recherche debouncée : met l'URL à jour sans recharger la page.
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => router.replace(`${pathname}?${withParam(params, "q", search)}`), 250);
    return () => clearTimeout(t);
  }, [search, q, params, pathname, router]);

  const hasFilters = Boolean(q || category || tag || archived);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="search"
          className="input"
          placeholder={m.notes.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={m.common.search}
        />
        {hasFilters && (
          <Link href={pathname} className="btn btn-ghost shrink-0">
            {m.notes.clearFilters}
          </Link>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        <Link href={`${pathname}?${withParam(params, "category", "")}`} className="chip" data-active={!category}>
          {m.common.all}
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`${pathname}?${withParam(params, "category", c)}`}
            className={`chip cat-${c}`}
            data-active={category === c}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--c)" }} />
            {m.categories[c]}
            {counts[c] ? <span className="opacity-60">{counts[c]}</span> : null}
          </Link>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {tags.map((t) => (
            <Link
              key={t}
              href={`${pathname}?${withParam(params, "tag", tag === t ? "" : t)}`}
              className="chip"
              data-active={tag === t}
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      <label className="inline-flex items-center gap-2 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => router.replace(`${pathname}?${withParam(params, "archived", e.target.checked ? "true" : "")}`)}
        />
        {m.notes.showArchived}
      </label>
    </div>
  );
}

function withParam(params: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(params.toString());
  if (value) next.set(key, value);
  else next.delete(key);
  return next.toString();
}
