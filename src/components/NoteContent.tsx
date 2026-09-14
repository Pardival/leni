/**
 * Affiche le contenu réécrit : paragraphes et listes ("- ") produits par le LLM.
 * Volontairement minimal : pas de Markdown complet.
 */
export function NoteContent({ text, className = "" }: { text: string; className?: string }) {
  const blocks: { type: "p" | "ul"; lines: string[] }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[-•*]\s+/.test(line);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      const item = line.replace(/^[-•*]\s+/, "");
      if (last?.type === "ul") last.lines.push(item);
      else blocks.push({ type: "ul", lines: [item] });
    } else {
      blocks.push({ type: "p", lines: [line] });
    }
  }
  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {blocks.map((b, i) =>
        b.type === "ul" ? (
          <ul key={i} className="space-y-1 pl-1">
            {b.lines.map((l, j) => (
              <li key={j} className="flex gap-2">
                <span className="text-accent shrink-0">–</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.lines[0]}</p>
        ),
      )}
    </div>
  );
}
