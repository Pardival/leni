import { NextResponse, type NextRequest } from "next/server";

/**
 * Garde d'accès optimiste : quand APP_PASSWORD est défini, toute page (hors
 * /login et /api/*) exige le cookie de session. La vérification cryptographique
 * réelle est faite dans `lib/auth` côté serveur ; ici on ne fait que rediriger.
 */
export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD?.trim();
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/")) return NextResponse.next();

  if (!request.cookies.get("leni_session")?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|icons/|manifest.webmanifest).*)"],
};
