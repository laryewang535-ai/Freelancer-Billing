import Link from "next/link";
import { auth } from "../../auth";

const features = [
  "Create professional invoices",
  "Manage clients and billing history",
  "Export PDF and DOCX documents",
  "Track paid, unpaid, and overdue invoices",
  "Send payment reminder emails",
  "Generate invoice drafts with AI",
];

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
              F
            </span>
            <span className="text-lg font-semibold">Freelancer Billing</span>
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-slate-600">
            <Link href="/pricing" className="hover:text-slate-950">
              Pricing
            </Link>
            <Link href="/terms" className="hover:text-slate-950">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-950">
              Privacy
            </Link>
            <Link href="/refund-policy" className="hover:text-slate-950">
              Refunds
            </Link>
            <Link
              href={session?.user ? "/dashboard" : "/login"}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              {session?.user ? "Dashboard" : "Login"}
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Invoicing software for freelancers
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Create clean invoices, track payments, and spend less time chasing admin work.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Freelancer Billing helps independent consultants, small agencies, and service
            providers manage clients, invoices, payment status, document exports, and reminder
            emails from one simple workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={session?.user ? "/dashboard" : "/register"}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {session?.user ? "Open dashboard" : "Start free"}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View pricing
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Built for service businesses</h2>
          <ul className="mt-5 space-y-3 text-sm text-slate-700">
            {features.map((feature) => (
              <li key={feature} className="flex gap-3">
                <span className="mt-0.5 text-blue-600">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
