"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import type { OpenAction } from "@/lib/notes";
import { useCategories } from "./CategoriesProvider";
import { IconCheck } from "./icons";

export function OpenActions({ actions }: { actions: OpenAction[] }) {
  const { m } = useI18n();
  const { label } = useCategories();
  const router = useRouter();
  const [, start] = useTransition();
  const [done, setDone] = useState<Set<string>>(new Set());

  async function check(a: OpenAction) {
    const key = `${a.noteId}|${a.text}`;
    setDone((s) => new Set(s).add(key));
    const res = await fetch(`/api/notes/${a.noteId}`);
    if (!res.ok) return;
    const note = (await res.json()) as { doneActionItems: string[] };
    await fetch(`/api/notes/${a.noteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ doneActionItems: [...new Set([...note.doneActionItems, a.text])] }),
    });
    setTimeout(() => start(() => router.refresh()), 450);
  }

  if (actions.length === 0) {
    return <div className="card p-5 text-sm text-muted">{m.notes.noOpenActions}</div>;
  }

  return (
    <div className="card divide-y divide-border-2">
      {actions.map((a) => {
        const key = `${a.noteId}|${a.text}`;
        const checked = done.has(key);
        return (
          <div key={key} className={`flex items-center gap-3 px-4 py-3.5 transition ${checked ? "opacity-40" : ""}`}>
            <button type="button" className="checkbox" data-checked={checked} onClick={() => check(a)} aria-label={a.text}>
              {checked && <IconCheck />}
            </button>
            <Link href={`/notes/${a.noteId}`} className="flex-1 min-w-0">
              <div className={`text-[15px] font-semibold leading-snug ${checked ? "line-through" : ""}`}>{a.text}</div>
              <div className="text-xs text-muted mt-0.5 truncate">
                {label(a.category)}
                {a.dueDate ? ` · ${a.dueDate}` : a.noteTitle ? ` · ${a.noteTitle}` : ""}
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
