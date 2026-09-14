import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { m } = await getI18n();
  return (
    <div className="card p-10 text-center mt-10">
      <p className="text-lg">{m.note.notFound}</p>
      <Link href="/" className="btn mt-4">
        ← {m.common.back}
      </Link>
    </div>
  );
}
