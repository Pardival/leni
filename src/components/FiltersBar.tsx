"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KINDS } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { useCategories } from "./CategoriesProvider";
import { KIND_ICONS } from "./KindIcon";
import { IconSearch } from "./icons";

export function FiltersBar({ tags }: { tags: string[] }) {
  const { m } = useI18n();
  const { label } = useCategories();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const kind = params.get("kind") ?? "";
  const tag = params.get("tag") ?? "";
  const archived = params.get("archived") === "true";
  const [search, setSearch] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  if (prevQ !== q) {
    setPrevQ(q);
    setSearch(q);
  }

  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => router.replace(`${pathname}?${withParam(params, "q", search)}`), 250);
    return () => clearTimeout(t);
  }, [search, q, params, pathname, router]);

  const hasFilters = Boolean(q || category || kind || tag || archived);

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input
          type="search"
          className="input pl-10"
          placeholder={m.notes.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={m.common.search}
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
        <Link href="/ask" className="chip text-accent border-accent/40">
          ✦ {m.notes.askLeni}
        </Link>
        {category && (
          <Link href={`${pathname}?${withParam(params, "category", "")}`} className="chip" data-active="true">
            {label(category)} ×
          </Link>
        )}
        {tag && (
          <Link href={`${pathname}?${withParam(params, "tag", "")}`} className="chip" data-active="true">
            #{tag} ×
          </Link>
        )}
        {KINDS.map((k) => {
          const Icon = KIND_ICONS[k];
          return (
            <Link key={k} href={`${pathname}?${withParam(params, "kind", kind === k ? "" : k)}`} className="chip" data-active={kind === k}>
              <Icon size={14} />
              {m.kinds[k]}
            </Link>
          );
        })}
        <Link href={`${pathname}?${withParam(params, "archived", archived ? "" : "true")}`} className="chip" data-active={archived}>
          {m.notes.showArchived}
        </Link>
        {hasFilters && (
          <Link href={pathname} className="chip text-accent">
            {m.notes.clearFilters}
          </Link>
        )}
      </div>

      {tags.length > 0 && !tag && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
          {tags.map((t) => (
            <Link key={t} href={`${pathname}?${withParam(params, "tag", t)}`} className="chip">
              #{t}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function withParam(params: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(params.toString());
  if (value) next.set(key, value);
  else next.delete(key);
  return next.toString();
}
