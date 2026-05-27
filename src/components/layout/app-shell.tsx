import Link from "next/link";
import { signOut } from "../../../auth";
import { DashboardNav } from "./dashboard-nav";
import type { Plan } from "@prisma/client";

type AppShellProps = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    plan: Plan;
  };
  children: React.ReactNode;
};

async function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      >
        Sign out
      </button>
    </form>
  );
}

const planStyles: Record<Plan, string> = {
  FREE: "bg-slate-100 text-slate-600",
  PRO: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  BUSINESS: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-4 sm:gap-8">
            <Link
              href="/dashboard"
              className="group flex shrink-0 items-center gap-2.5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition group-hover:shadow-lg group-hover:shadow-blue-500/30">
                F
              </span>
              <span className="hidden font-semibold tracking-tight text-slate-900 sm:inline">
                Freelancer Billing
              </span>
            </Link>
            <DashboardNav />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden max-w-[180px] truncate text-sm text-slate-600 lg:inline">
              {user.email ?? user.name ?? "User"}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${planStyles[user.plan]}`}
            >
              {user.plan}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}
