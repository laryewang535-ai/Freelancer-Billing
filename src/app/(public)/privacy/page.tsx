export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: June 1, 2026</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-950">Information We Collect</h2>
          <p className="mt-2">
            We collect account information such as name, email address, password hash, company
            details, client records, invoice data, payment tracking records, and settings you
            create in the application.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">How We Use Information</h2>
          <p className="mt-2">
            We use your information to provide the service, authenticate users, generate
            invoices and documents, send transactional emails, process subscriptions, prevent
            abuse, and improve product reliability.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">Service Providers</h2>
          <p className="mt-2">
            We may use trusted providers for hosting, authentication, email delivery, file
            storage, analytics, AI-assisted invoice generation, and payment processing. These
            providers process data only for the purposes of delivering the service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">Payment Data</h2>
          <p className="mt-2">
            Card numbers and sensitive payment credentials are handled by our payment provider.
            We do not store full card numbers on our servers.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">Data Retention</h2>
          <p className="mt-2">
            We keep account and billing data while your account is active and as needed for
            legal, security, and accounting purposes. You may request account deletion by
            contacting support.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">Contact</h2>
          <p className="mt-2">
            Privacy requests can be sent to{" "}
            <a className="text-blue-600 hover:underline" href="mailto:support@freelancer-bill.com">
              support@freelancer-bill.com
            </a>.
          </p>
        </section>
      </div>
    </article>
  );
}
