"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCategories } from "./CategoriesProvider";
import { ThemeIcon } from "./ThemeIcon";

export function ThemeTiles({ counts }: { counts: Record<string, number> }) {
  const { categories, label } = useCategories();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  // Peu de notes : on montre le vocabulaire complet ; sinon seulement les thèmes utilisés.
  const visible = categories.filter((c) => (total < 5 ? c.slug !== "other" : (counts[c.slug] ?? 0) > 0));
  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap">
      {visible.map((c) => (
        <Link
          key={c.slug}
          href={`/?category=${c.slug}`}
          className="tint flex flex-col justify-between w-28 h-[84px] p-3 rounded-2xl shrink-0 transition hover:brightness-95"
          style={{ "--c": c.color } as CSSProperties}
        >
          <ThemeIcon slug={c.slug} />
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold truncate">{label(c.slug)}</span>
            <span className="text-xs font-semibold opacity-70">{counts[c.slug] ?? 0}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
