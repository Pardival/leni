"use client";

import type { Category } from "@/db/schema";
import { useI18n } from "@/i18n/client";

export function CategoryBadge({ category, className = "" }: { category: Category; className?: string }) {
  const { m } = useI18n();
  return <span className={`cat cat-${category} ${className}`}>{m.categories[category]}</span>;
}
