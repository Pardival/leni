import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/i18n";

/** POST /api/locale { locale } — mémorise la langue de l'interface. */
export async function POST(request: Request) {
  const { locale } = (await request.json().catch(() => ({}))) as { locale?: string };
  if (!isLocale(locale)) return Response.json({ error: "unknown_locale" }, { status: 400 });
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return Response.json({ locale });
}
