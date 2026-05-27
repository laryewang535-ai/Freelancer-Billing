import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-8 py-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm">
        <LoadingSpinner size="lg" label="Loading" />
        <p className="text-sm font-medium text-slate-500">Loading…</p>
      </div>
    </main>
  );
}
