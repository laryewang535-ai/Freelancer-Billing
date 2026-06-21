import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "For trying the core invoicing workflow.",
    features: ["10 invoices per month", "Standard invoice template", "Client and payment tracking"],
  },
  {
    name: "Pro",
    price: "$9/month",
    description: "For freelancers who invoice clients regularly.",
    features: ["Unlimited invoices", "AI invoice generation", "Automatic payment reminders", "Analytics", "All templates"],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Invoicing software for freelancers
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Create invoices, track clients, and get paid with less admin work.
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          Freelancer Billing is a subscription SaaS product for independent consultants,
          small agencies, and service providers who need professional invoices, PDF/DOCX
          exports, payment tracking, reminders, and lightweight revenue analytics.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Start free
          </Link>
          <Link
            href="/terms"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View terms
          </Link>
        </div>
      </section>

      <section className="mt-14 grid gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.name} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-bold">{plan.price}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {plan.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-14 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Payment and billing</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Paid subscriptions are processed by our payment provider. We do not store card
          numbers on our servers. Customers can cancel future renewals from the billing
          portal or by contacting support.
        </p>
        <p className="mt-4 text-sm text-slate-600">
          Contact: <a className="text-blue-600 hover:underline" href="mailto:support@freelancer-bill.com">support@freelancer-bill.com</a>
        </p>
      </section>
    </div>
  );
}
