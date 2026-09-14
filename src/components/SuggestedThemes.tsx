"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { CategoryRow } from "@/db/schema";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/client";
import type { SuggestedTheme } from "@/lib/categories";
import { useCategories } from "./CategoriesProvider";

type Props = { suggestions: SuggestedTheme[]; categories: CategoryRow[]; threshold: number };

export function SuggestedThemes({ suggestions, categories, threshold }: Props) {
  const { m } = useI18n();
  const { label } = useCategories();
  const router = useRouter();
  const [, start] = useTransition();
  const refresh = () => start(() => router.refresh());

  async function promote(s: SuggestedTheme, into?: string) {
    await fetch("/api/categories/suggested", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: s.name, description: s.description, into }),
    });
    refresh();
  }
  async function dismiss(s: SuggestedTheme) {
    await fetch("/api/categories/suggested", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: s.name }),
    });
    refresh();
  }

  return (
    <section className="card p-4 space-y-3 border-dashed">
      <div>
        <h2 className="font-semibold">{m.categoriesPage.suggestedTitle}</h2>
        <p className="text-sm text-muted">{format(m.categoriesPage.suggestedIntro, { threshold })}</p>
      </div>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li key={s.name} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{s.name}</span>
            <span className="text-xs text-muted">{format(m.categoriesPage.notesCount, { count: s.count })}</span>
            {s.description && <span className="text-xs text-muted basis-full sm:basis-auto">{s.description}</span>}
            <span className="ml-auto flex gap-1.5 items-center">
              <button className="btn text-xs py-1.5" onClick={() => promote(s)}>
                {m.categoriesPage.createNow}
              </button>
              <select className="input text-xs w-auto py-1.5" value="" onChange={(e) => e.target.value && promote(s, e.target.value)}>
                <option value="">{m.categoriesPage.attachTo}</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {label(c.slug)}
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost text-xs py-1.5" onClick={() => dismiss(s)}>
                {m.categoriesPage.dismiss}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
