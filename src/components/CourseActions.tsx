"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SourceStatus } from "@/db/schema";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { IconRefresh, IconTrash } from "./icons";

export function CourseActions({ id, title, status }: { id: string; title: string; status: SourceStatus }) {
  const { m } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    await fetch(`/api/sources/${id}/process`, { method: "POST" });
    router.refresh();
    setBusy(false);
  }
  async function remove() {
    if (!confirm(format(m.learn.deleteConfirm, { title }))) return;
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    router.push("/learn");
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      {status === "error" && (
        <button type="button" className="w-10 h-10 rounded-full bg-white/70 dark:bg-black/25 flex items-center justify-center" onClick={retry} disabled={busy} title={m.learn.retry} aria-label={m.learn.retry}>
          <IconRefresh className={busy ? "pulse" : ""} />
        </button>
      )}
      <button type="button" className="w-10 h-10 rounded-full bg-white/70 dark:bg-black/25 flex items-center justify-center" onClick={remove} title={m.learn.delete} aria-label={m.learn.delete}>
        <IconTrash />
      </button>
    </div>
  );
}
