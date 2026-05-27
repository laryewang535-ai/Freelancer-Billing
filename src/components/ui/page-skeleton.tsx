import { cn } from "@/lib/utils/cn";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/80", className)} />;
}

/** 仪表盘区域骨架屏 */
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-8" aria-busy aria-label="Loading page">
      <div className="space-y-2">
        <Bone className="h-8 w-48" />
        <Bone className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="app-card p-5">
            <Bone className="h-4 w-20" />
            <Bone className="mt-3 h-8 w-28" />
          </div>
        ))}
      </div>
      <div className="app-card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <Bone className="h-5 w-32" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 列表页通用骨架 */
export function ListPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Bone className="h-8 w-40" />
          <Bone className="h-4 w-56" />
        </div>
        <Bone className="h-11 w-36" />
      </div>
      <Bone className="h-10 w-full max-w-xl" />
      <div className="app-card overflow-hidden p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bone key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
