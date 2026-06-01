export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: June 1, 2026</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-950">1. Service</h2>
          <p className="mt-2">
            Freelancer Billing provides web-based tools for creating invoices, managing
            clients, tracking payments, exporting invoice documents, and sending reminders.
            The service is intended for lawful business and productivity use.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">2. Accounts</h2>
          <p className="mt-2">
            You are responsible for keeping your login credentials secure and for all activity
            under your account. You must provide accurate account and billing information.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">3. Subscriptions</h2>
          <p className="mt-2">
            Paid plans renew automatically unless cancelled before the next billing date.
            Subscription features and limits are described on the pricing page.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">4. Prohibited Use</h2>
          <p className="mt-2">
            You may not use the service for illegal activity, fraud, spam, regulated financial
            services, gambling, adult content, crypto trading, or any activity that violates
            applicable laws or third-party rights.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">5. Customer Data</h2>
          <p className="mt-2">
            You retain ownership of the client, invoice, and business data you enter. You grant
            us permission to process that data only as needed to provide and improve the service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">6. Availability</h2>
          <p className="mt-2">
            We aim to provide a reliable service, but we do not guarantee uninterrupted access.
            The service is provided on an as-is and as-available basis.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">7. Contact</h2>
          <p className="mt-2">
            Questions about these terms can be sent to{" "}
            <a className="text-blue-600 hover:underline" href="mailto:support@freelancer-bill.com">
              support@freelancer-bill.com
            </a>.
          </p>
        </section>
      </div>
    </article>
  );
}
