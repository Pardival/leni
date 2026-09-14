"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CategoryRow } from "@/db/schema";
import { useI18n } from "@/i18n/client";

type Ctx = {
  categories: CategoryRow[];
  get(slug: string): CategoryRow | undefined;
  /** Libellé : traduit pour les catégories système, nom stocké sinon. */
  label(slug: string): string;
};

const CategoriesContext = createContext<Ctx | null>(null);

export function CategoriesProvider({ categories, children }: { categories: CategoryRow[]; children: ReactNode }) {
  const { m } = useI18n();
  const map = new Map(categories.map((c) => [c.slug, c]));
  const value: Ctx = {
    categories,
    get: (slug) => map.get(slug),
    label: (slug) => {
      const c = map.get(slug);
      if (c?.isSystem && slug in m.categories) return m.categories[slug as keyof typeof m.categories];
      return c?.name ?? slug;
    },
  };
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): Ctx {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories must be used inside <CategoriesProvider>");
  return ctx;
}
