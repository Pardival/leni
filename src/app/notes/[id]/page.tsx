import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { NoteEditor } from "@/components/NoteEditor";
import { getNote } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) notFound();
  return (
    <div className="-mt-4">
      <AutoRefresh active={note.status === "processing"} />
      <NoteEditor key={note.updatedAt} note={note} />
    </div>
  );
}
