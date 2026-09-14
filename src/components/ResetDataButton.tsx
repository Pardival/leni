"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { IconTrash } from "./icons";

export function ResetDataButton() {
  const { m } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reset() {
    if (!confirm(m.me.resetConfirm1)) return;
    const word = prompt(m.me.resetConfirm2);
    if (word?.trim().toUpperCase() !== m.me.resetWord) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "yes" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const r = (await res.json()) as { notes: number; categories: number; audioFiles: number };
      setMessage(format(m.me.resetDone, r));
      router.refresh();
    } catch {
      setMessage(m.me.resetError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" className="btn btn-danger" onClick={reset} disabled={busy}>
        <IconTrash />
        {m.me.resetButton}
      </button>
      {message && <p className="text-xs text-muted text-right">{message}</p>}
    </div>
  );
}
