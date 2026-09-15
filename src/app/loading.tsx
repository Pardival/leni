import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-7 pt-2">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="h-[92px] rounded-[22px]" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[140px]" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-2.5">
          <Skeleton className="h-[84px] w-28" />
          <Skeleton className="h-[84px] w-28" />
          <Skeleton className="h-[84px] w-28" />
        </div>
      </div>
    </div>
  );
}
