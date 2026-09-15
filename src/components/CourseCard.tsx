"use client";

import Link from "next/link";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/client";
import type { SourceSummary } from "@/lib/learn/sources";
import { IconBook, IconChevron } from "./icons";

export function CourseCard({ course, compact = false }: { course: SourceSummary; compact?: boolean }) {
  const { m } = useI18n();
  const processing = course.status !== "ready" && course.status !== "error";
  return (
    <Link href={`/learn/${course.id}`} prefetch={true} className={`card flex items-center gap-3 px-4 py-3.5 hover:border-faint transition ${processing ? "pulse" : ""}`}>
      <span className="tint w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ "--c": "#5b2fd1" } as React.CSSProperties}>
        <IconBook size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold leading-snug truncate">{course.title}</div>
        <div className="text-xs text-muted mt-0.5 truncate">
          {course.status === "ready" ? (
            <>
              {format(m.learn.mastery, { value: course.mastery })}
              {course.due > 0 ? ` · ${format(m.learn.due, { count: course.due })}` : ""}
              {!compact ? ` · ${format(m.learn.cardsCount, { count: course.verified })}` : ""}
            </>
          ) : (
            m.learn.status[course.status]
          )}
        </div>
        {course.status === "ready" && (
          <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${course.mastery}%`, background: "#5b2fd1" }} />
          </div>
        )}
      </div>
      <IconChevron className="text-faint shrink-0" />
    </Link>
  );
}
