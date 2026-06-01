import { Suspense } from "react";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { listInvoices } from "@/lib/services/invoice.service";
import { InvoicesPageClient } from "@/components/invoices/invoices-page-client";

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const result = await listInvoices(session.user.id);

  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
      <InvoicesPageClient
        initialItems={result.items}
        initialMeta={result.meta}
      />
    </Suspense>
  );
}
