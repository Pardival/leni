import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Insights } from "@/components/Insights";
import { NoteEditor } from "@/components/NoteEditor";
import { RelatedNotes } from "@/components/RelatedNotes";
import { hasOpenAI } from "@/lib/config";
import { listInsights } from "@/lib/insights";
import { getNote } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) notFound();
  const insights = await listInsights(id);
  const reflective = note.kind === "reflection" || note.kind === "journal";
  return (
    <div className="-mt-4 space-y-8">
      <AutoRefresh active={note.status === "processing"} />
      <NoteEditor key={note.updatedAt} note={note} />
      <div className="space-y-8 px-0 sm:px-0">
        <Insights noteId={id} insights={insights} canDeepen={hasOpenAI()} emphasize={reflective} />
        <RelatedNotes noteId={id} />
      </div>
    </div>
  );
}
