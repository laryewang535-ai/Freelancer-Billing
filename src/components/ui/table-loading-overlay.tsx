import { LoadingSpinner } from "@/components/ui/loading-spinner";

/** 表格区域加载遮罩 */
export function TableLoadingOverlay({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[2px]"
      aria-live="polite"
      aria-busy
    >
      <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-6 py-4 shadow-lg shadow-slate-200/50">
        <LoadingSpinner size="md" prominent label={label} />
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
