"use client";

import type { CSSProperties } from "react";
import { useCategories } from "./CategoriesProvider";

export function CategoryBadge({ slug, className = "" }: { slug: string; className?: string }) {
  const { get, label } = useCategories();
  const color = get(slug)?.color ?? "var(--cat-other)";
  return (
    <span className={`cat ${className}`} style={{ "--c": color } as CSSProperties}>
      {label(slug)}
    </span>
  );
}
