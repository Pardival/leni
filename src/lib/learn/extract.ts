import { convert } from "html-to-text";

export type Extracted = { text: string; pageCount?: number; title?: string };

/** Texte d'un PDF (toutes pages fusionnées). */
export async function extractPdf(data: Uint8Array): Promise<Extracted> {
  const { extractText } = await import("unpdf");
  const { text, totalPages } = await extractText(data, { mergePages: true });
  return { text: cleanText(text), pageCount: totalPages };
}

/** Texte lisible d'une page web. */
export async function extractUrl(url: string): Promise<Extracted> {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Leni/1.0)", accept: "text/html,application/pdf,*/*" }, redirect: "follow" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
    const out = await extractPdf(new Uint8Array(await res.arrayBuffer()));
    return { ...out, title: url.split("/").pop() };
  }
  const html = await res.text();
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim();
  const text = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
      { selector: "nav", format: "skip" },
      { selector: "header", format: "skip" },
      { selector: "footer", format: "skip" },
      { selector: "script", format: "skip" },
      { selector: "style", format: "skip" },
    ],
  });
  return { text: cleanText(text), title };
}

export function cleanText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Découpe en morceaux d'environ `size` caractères, sur des frontières de paragraphe. */
export function chunkText(text: string, size = 14000): string[] {
  if (text.length <= size) return [text];
  const paras = text.split(/\n\n+/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur.length + p.length + 2 > size && cur) {
      chunks.push(cur);
      cur = "";
    }
    if (p.length > size) {
      for (let i = 0; i < p.length; i += size) chunks.push(p.slice(i, i + size));
      continue;
    }
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) chunks.push(cur);
  return chunks;
}
