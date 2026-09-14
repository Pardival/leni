import { AddSource } from "@/components/AddSource";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CourseCard } from "@/components/CourseCard";
import { getI18n } from "@/i18n/server";
import { listSources } from "@/lib/learn/sources";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const { m } = await getI18n();
  const courses = await listSources();
  const processing = courses.some((c) => c.status !== "ready" && c.status !== "error");
  return (
    <div className="space-y-6">
      <AutoRefresh active={processing} intervalMs={4000} />
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight">{m.learn.title}</h1>
        <p className="text-muted mt-1">{m.learn.intro}</p>
      </div>
      <section className="space-y-2">
        <h2 className="section-title">{m.learn.add}</h2>
        <AddSource />
      </section>
      <section className="space-y-2">
        {courses.length === 0 ? (
          <div className="card p-8 text-center text-muted">{m.learn.empty}</div>
        ) : (
          courses.map((c) => <CourseCard key={c.id} course={c} />)
        )}
      </section>
    </div>
  );
}
