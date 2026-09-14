/** Helpers de formatage sans dépendance Node : utilisables côté client. */

export function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(d);
}

export function formatTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(d);
}

/** Clé de jour locale (YYYY-MM-DD) pour grouper les notes. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Libellé de groupe : "Aujourd'hui", "Hier" ou la date longue.
 * `labels` vient des messages i18n.
 */
export function dayLabel(key: string, locale: string, labels: { today: string; yesterday: string }): string {
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  if (key === today) return labels.today;
  if (key === yesterday) return labels.yesterday;
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(y!, m! - 1, d!),
  );
}

export function appleMapsUrl(lat: number, lng: number, label?: string | null): string {
  const q = label ? `&q=${encodeURIComponent(label)}` : "";
  return `https://maps.apple.com/?ll=${lat},${lng}${q}`;
}
