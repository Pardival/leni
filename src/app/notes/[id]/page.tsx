import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { NoteEditor } from "@/components/NoteEditor";
import { getI18n } from "@/i18n/server";
import { getNote } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await getNote(id);
  const { m } = await getI18n();
  if (!note) notFound();

  return (
    <div className="space-y-4">
      <AutoRefresh active={note.status === "processing"} />
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← {m.common.back}
      </Link>
      <NoteEditor key={note.updatedAt} note={note} />
    </div>
  );
}
