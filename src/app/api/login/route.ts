import { cookies } from "next/headers";
import { checkPassword, SESSION_COOKIE, sessionValue } from "@/lib/auth";

/** POST /api/login { password } — ouvre une session web quand APP_PASSWORD est défini. */
export async function POST(request: Request) {
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };
  if (!password || !checkPassword(password)) {
    return Response.json({ error: "wrong_password" }, { status: 401 });
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionValue()!, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
