import { getI18n } from "@/i18n/server";
import { relatedNotes } from "@/lib/embeddings";
import { NoteRow } from "./NoteRow";

/** Notes proches par le sens, calculées côté serveur. */
export async function RelatedNotes({ noteId }: { noteId: string }) {
  const { m } = await getI18n();
  const related = await relatedNotes(noteId, 5);
  if (related.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="label">{m.related.title}</h2>
      <div className="space-y-2">
        {related.map((r) => (
          <NoteRow key={r.note.id} note={r.note} />
        ))}
      </div>
    </section>
  );
}
