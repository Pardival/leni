import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, getMessages, isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from ".";

/** Langue courante côté serveur : cookie, sinon Accept-Language, sinon défaut. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const h = await headers();
  return negotiateLocale(h.get("accept-language")) ?? DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, m: getMessages(locale) };
}
