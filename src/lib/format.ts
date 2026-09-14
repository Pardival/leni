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

/** Clé de jour (YYYY-MM-DD) dans le fuseau donné (sinon celui de l'environnement). */
export function dayKey(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Libellé de groupe : "Aujourd'hui", "Hier" ou la date longue.
 * `labels` vient des messages i18n.
 */
export function dayLabel(key: string, locale: string, labels: { today: string; yesterday: string }, timeZone?: string): string {
  const today = dayKey(new Date().toISOString(), timeZone);
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString(), timeZone);
  if (key === today) return labels.today;
  if (key === yesterday) return labels.yesterday;
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y!, m! - 1, d!)),
  );
}

export function appleMapsUrl(lat: number, lng: number, label?: string | null): string {
  const q = label ? `&q=${encodeURIComponent(label)}` : "";
  return `https://maps.apple.com/?ll=${lat},${lng}${q}`;
}
