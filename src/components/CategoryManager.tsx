"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CategoryRow } from "@/db/schema";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { useCategories } from "./CategoriesProvider";

export function CategoryManager({ categories, counts }: { categories: CategoryRow[]; counts: Record<string, number> }) {
  const { m } = useI18n();
  const { label } = useCategories();
  const router = useRouter();
  const [, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const refresh = () => start(() => router.refresh());

  async function save(slug: string) {
    await fetch(`/api/categories/${slug}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setEditing(null);
    refresh();
  }

  async function merge(from: CategoryRow, into: string) {
    if (!into || into === from.slug) return;
    if (!confirm(format(m.categoriesPage.mergeConfirm, { from: label(from.slug), into: label(into) }))) return;
    await fetch(`/api/categories/${from.slug}/merge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ into }),
    });
    refresh();
  }

  async function remove(c: CategoryRow) {
    if (!confirm(format(m.categoriesPage.deleteConfirm, { name: label(c.slug) }))) return;
    await fetch(`/api/categories/${c.slug}`, { method: "DELETE" });
    refresh();
  }

  return (
    <ul className="space-y-2">
      {categories.map((c) => (
        <li key={c.slug} className="card p-4">
          {editing === c.slug ? (
            <div className="space-y-2">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.categoriesPage.name} />
              <input
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={m.categoriesPage.description}
              />
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setEditing(null)}>
                  {m.common.cancel}
                </button>
                <button className="btn btn-primary" onClick={() => save(c.slug)}>
                  {m.common.save}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-start gap-3">
              <span className="mt-1.5 w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
              <div className="flex-1 min-w-40">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{label(c.slug)}</span>
                  <span className="text-xs text-muted">{format(m.categoriesPage.notesCount, { count: counts[c.slug] ?? 0 })}</span>
                  <span className="chip text-[10px]">{c.isSystem ? m.categoriesPage.system : m.categoriesPage.createdByLeni}</span>
                </div>
                {c.description && <p className="text-sm text-muted mt-0.5">{c.description}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  className="btn btn-ghost text-xs"
                  onClick={() => {
                    setEditing(c.slug);
                    setName(c.name);
                    setDescription(c.description);
                  }}
                >
                  {m.categoriesPage.rename}
                </button>
                <select
                  className="input text-xs w-auto py-1.5"
                  value=""
                  onChange={(e) => merge(c, e.target.value)}
                  aria-label={m.categoriesPage.mergeInto}
                >
                  <option value="">{m.categoriesPage.mergeInto}</option>
                  {categories
                    .filter((o) => o.slug !== c.slug)
                    .map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {label(o.slug)}
                      </option>
                    ))}
                </select>
                {!c.isSystem && (
                  <button className="btn btn-ghost text-xs text-danger" onClick={() => remove(c)}>
                    {m.common.delete}
                  </button>
                )}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
