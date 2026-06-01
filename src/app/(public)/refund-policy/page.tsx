export default function RefundPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Refund Policy</h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: June 1, 2026</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-950">Refund Window</h2>
          <p className="mt-2">
            If you are not satisfied with a paid subscription, contact us within 14 days of the
            initial purchase or renewal and we will review your refund request.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">Eligibility</h2>
          <p className="mt-2">
            Refunds are generally available when the service was not materially used, a duplicate
            charge occurred, or a billing error was made. We may decline refunds for abusive use
            or requests outside the refund window.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">Cancellations</h2>
          <p className="mt-2">
            You can cancel future renewals from the billing portal. Cancelling stops future
            billing but does not automatically refund previous charges.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-950">How To Request A Refund</h2>
          <p className="mt-2">
            Email{" "}
            <a className="text-blue-600 hover:underline" href="mailto:support@freelancer-bill.com">
              support@freelancer-bill.com
            </a>{" "}
            with your account email, invoice or payment reference, and the reason for the request.
          </p>
        </section>
      </div>
    </article>
  );
}
