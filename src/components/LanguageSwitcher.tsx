"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, MESSAGES, type Locale } from "@/i18n";
import { useI18n } from "@/i18n/client";

export function LanguageSwitcher() {
  const { locale, m } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  async function change(next: Locale) {
    if (next === locale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    start(() => router.refresh());
  }

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{m.nav.language}</span>
      <select
        aria-label={m.nav.language}
        value={locale}
        disabled={pending}
        onChange={(e) => change(e.target.value as Locale)}
        className="text-sm bg-transparent border border-border rounded-lg px-2 py-1.5 text-muted hover:text-ink cursor-pointer"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {MESSAGES[l].meta.flag} {MESSAGES[l].meta.name}
          </option>
        ))}
      </select>
    </label>
  );
}
