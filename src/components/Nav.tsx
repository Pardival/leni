"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { LanguageSwitcher } from "./LanguageSwitcher";

const ICONS = {
  notes: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 10h8M8 14h8M8 18h5" />
    </svg>
  ),
  capture: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  ),
  explore: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="8" r="2.5" /><circle cx="12" cy="18" r="2.5" />
      <path d="M8.2 7.2l7.4 0.6M7.5 8l3.2 8M16.6 10.2l-3.4 5.8" />
    </svg>
  ),
  setup: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="2.5" />
      <path d="M11 18h2M4 8v4" />
    </svg>
  ),
};

export function Nav() {
  const { m } = useI18n();
  const pathname = usePathname();
  const items = [
    { href: "/", label: m.nav.notes, icon: ICONS.notes, active: pathname === "/" || pathname.startsWith("/notes") },
    { href: "/capture", label: m.nav.capture, icon: ICONS.capture, active: pathname.startsWith("/capture") },
    { href: "/explore", label: m.nav.explore, icon: ICONS.explore, active: pathname.startsWith("/explore") },
    { href: "/setup", label: m.nav.setup, icon: ICONS.setup, active: pathname.startsWith("/setup") },
  ];

  return (
    <>
      {/* Barre haute */}
      <header className="sticky top-0 z-30 backdrop-blur bg-bg/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-lg">
            <span className="inline-flex w-7 h-7 rounded-lg bg-accent text-accent-ink items-center justify-center text-sm font-bold">
              L
            </span>
            {m.app.name}
          </Link>
          <nav className="hidden sm:flex items-center gap-1 ml-6">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                  it.active ? "bg-surface-2 text-ink font-medium" : "text-muted hover:text-ink hover:bg-surface-2"
                }`}
              >
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Link href="/capture" className="btn btn-primary hidden md:inline-flex">
              {ICONS.capture}
              {m.nav.capture}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Barre basse mobile */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border pb-safe">
        <div className="grid grid-cols-4">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-1 py-2 text-[11px] ${it.active ? "text-accent" : "text-muted"}`}
            >
              {it.icon}
              {it.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
