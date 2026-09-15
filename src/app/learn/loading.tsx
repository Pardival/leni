import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-[170px]" />
      <Skeleton className="h-[72px]" />
      <Skeleton className="h-[72px]" />
    </div>
  );
}
