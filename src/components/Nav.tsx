"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { IconBook, IconExplore, IconMic, IconNotes, IconUser } from "./icons";

export function Nav() {
  const { m } = useI18n();
  const pathname = usePathname();
  const items = [
    { href: "/", label: m.nav.notes, Icon: IconNotes, active: pathname === "/" || pathname.startsWith("/notes") },
    { href: "/learn", label: m.nav.learn, Icon: IconBook, active: pathname.startsWith("/learn") },
    { href: "/explore", label: m.nav.explore, Icon: IconExplore, active: pathname.startsWith("/explore") || pathname.startsWith("/ask") },
    {
      href: "/me",
      label: m.nav.me,
      Icon: IconUser,
      active: pathname.startsWith("/me") || pathname.startsWith("/setup") || pathname.startsWith("/categories"),
    },
  ];
  if (pathname.startsWith("/capture") || /^\/learn\/[^/]+\/review/.test(pathname)) return null;

  return (
    <>
      {/* Barre haute (desktop) */}
      <header className="hidden sm:block sticky top-0 z-30 backdrop-blur bg-bg/80">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-lg display">
            <span className="inline-flex w-8 h-8 rounded-xl bg-accent text-accent-ink items-center justify-center text-sm font-bold">L</span>
            {m.app.name}
          </Link>
          <nav className="tabbar ml-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map((it) => (
              <Link key={it.href} href={it.href} prefetch={true} className="tab px-4" data-active={it.active}>
                <it.Icon size={18} />
                {it.label}
              </Link>
            ))}
          </nav>
          <Link href="/capture" prefetch={true} className="btn btn-primary ml-auto">
            <IconMic size={18} />
            {m.nav.capture}
          </Link>
        </div>
      </header>

      {/* Barre basse (mobile) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 px-4 pb-safe pointer-events-none">
        <div className="tabbar pointer-events-auto grid-cols-4">
          {items.map((it) => (
            <Link key={it.href} href={it.href} prefetch={true} className="tab text-[11px]" data-active={it.active}>
              <it.Icon size={17} />
              {it.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
