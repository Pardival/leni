import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="-mx-5 sm:mx-0 -mt-4 space-y-6">
      <Skeleton className="h-[220px] rounded-b-[28px] sm:rounded-[28px] rounded-t-none sm:rounded-t-[28px]" />
      <div className="px-5 sm:px-0 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
