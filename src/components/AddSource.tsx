"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SourceKind } from "@/db/schema";
import { useI18n } from "@/i18n/client";

export function AddSource() {
  const { m } = useI18n();
  const router = useRouter();
  const [kind, setKind] = useState<SourceKind>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = kind === "pdf" ? Boolean(file) : kind === "url" ? /^https?:\/\//.test(url.trim()) : text.trim().length >= 200;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      let res: Response;
      if (kind === "pdf" && file) {
        const form = new FormData();
        form.append("file", file);
        if (title.trim()) form.append("title", title.trim());
        res = await fetch("/api/sources", { method: "POST", body: form });
      } else {
        res = await fetch("/api/sources", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(kind === "url" ? { url: url.trim(), title: title.trim() || undefined } : { text: text.trim(), title: title.trim() || undefined }),
        });
      }
      if (res.status === 422) throw new Error(m.learn.tooShort);
      if (!res.ok) throw new Error(m.learn.error);
      const src = (await res.json()) as { id: string };
      router.push(`/learn/${src.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : m.learn.error);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 sm:p-5 space-y-3">
      <div className="flex gap-1.5">
        {(["pdf", "url", "text"] as SourceKind[]).map((k) => (
          <button key={k} type="button" className="chip" data-active={kind === k} onClick={() => setKind(k)}>
            {m.learn.kinds[k]}
          </button>
        ))}
      </div>

      {kind === "pdf" && (
        <label className="block">
          <input id="source-file" type="file" accept="application/pdf,.pdf" className="block w-full text-sm file:mr-3 file:btn file:btn-dark file:!min-h-0 file:py-2 file:px-3 file:text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <span className="block text-xs text-muted mt-1.5">{m.learn.pdfHint}</span>
        </label>
      )}
      {kind === "url" && <input id="source-url" className="input" type="url" placeholder={m.learn.urlPlaceholder} value={url} onChange={(e) => setUrl(e.target.value)} />}
      {kind === "text" && <textarea id="source-text" className="input min-h-40" placeholder={m.learn.textPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />}

      <div className="flex gap-2">
        <input id="source-title" className="input" placeholder={m.learn.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn btn-primary shrink-0" disabled={!canSubmit || busy}>
          {busy ? m.learn.submitting : m.learn.submit}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
