import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { IconChevron, IconGlobe, IconPhone, IconTag } from "@/components/icons";
import { getI18n } from "@/i18n/server";

export default async function MePage() {
  const { m } = await getI18n();
  const rows = [
    { href: "/setup", Icon: IconPhone, title: m.me.shortcut, hint: m.me.shortcutHint },
    { href: "/categories", Icon: IconTag, title: m.me.themes, hint: m.me.themesHint },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight">{m.me.title}</h1>
        <p className="text-muted mt-1">{m.me.intro}</p>
      </div>
      <div className="card divide-y divide-border-2">
        {rows.map((r) => (
          <Link key={r.href} href={r.href} className="flex items-center gap-3 px-4 py-4">
            <span className="w-10 h-10 rounded-xl bg-surface-2 text-ink flex items-center justify-center shrink-0">
              <r.Icon />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-semibold">{r.title}</span>
              <span className="block text-xs text-muted">{r.hint}</span>
            </span>
            <IconChevron className="text-faint" />
          </Link>
        ))}
        <div className="flex items-center gap-3 px-4 py-4">
          <span className="w-10 h-10 rounded-xl bg-surface-2 text-ink flex items-center justify-center shrink-0">
            <IconGlobe />
          </span>
          <span className="flex-1 text-[15px] font-semibold">{m.me.language}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
