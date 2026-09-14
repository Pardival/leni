"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";

export function LoginForm() {
  const { m } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) return setError(true);
    const next = params.get("next") || "/";
    router.replace(next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="label" htmlFor="pw">
        {m.login.password}
      </label>
      <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      {error && <p className="text-sm text-danger">{m.login.wrong}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !password}>
        {m.login.submit}
      </button>
    </form>
  );
}
