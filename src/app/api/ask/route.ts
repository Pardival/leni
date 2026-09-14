import { z } from "zod";
import { askLeni } from "@/lib/ai/ask";
import { authorize, unauthorized } from "@/lib/auth";

export const maxDuration = 60;

const Body = z.object({
  question: z.string().trim().min(2).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(10).optional(),
});

/** POST /api/ask { question, history? } — répond à partir des notes, avec sources. */
export async function POST(request: Request) {
  if (!(await authorize(request))) return unauthorized();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_payload" }, { status: 400 });
  try {
    return Response.json(await askLeni(parsed.data.question, parsed.data.history ?? []));
  } catch (err) {
    console.error("[leni] ask failed:", err);
    return Response.json({ error: "ask_failed", detail: String(err) }, { status: 502 });
  }
}
