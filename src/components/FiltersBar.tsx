"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KINDS } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { useCategories } from "./CategoriesProvider";
import { KIND_ICONS } from "./KindIcon";

type Props = {
  tags: string[];
  counts: Record<string, number>;
};

export function FiltersBar({ tags, counts }: Props) {
  const { m } = useI18n();
  const { categories, label } = useCategories();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const kind = params.get("kind") ?? "";
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

  const hasFilters = Boolean(q || category || kind || tag || archived);

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
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`${pathname}?${withParam(params, "category", c.slug)}`}
            className="chip"
            data-active={category === c.slug}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
            {label(c.slug)}
            {counts[c.slug] ? <span className="opacity-60">{counts[c.slug]}</span> : null}
          </Link>
        ))}
        <Link href="/categories" className="chip opacity-70" title={m.categoriesPage.manage}>
          ⚙︎
        </Link>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        <Link href={`${pathname}?${withParam(params, "kind", "")}`} className="chip" data-active={!kind}>
          {m.notes.allKinds}
        </Link>
        {KINDS.map((k) => (
          <Link key={k} href={`${pathname}?${withParam(params, "kind", kind === k ? "" : k)}`} className="chip" data-active={kind === k}>
            <span aria-hidden>{KIND_ICONS[k]}</span>
            {m.kinds[k]}
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
