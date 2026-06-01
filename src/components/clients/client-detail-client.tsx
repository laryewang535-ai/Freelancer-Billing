"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientFormDialog, type ClientFormValues } from "./client-form-dialog";
import { ClientStatusBadge } from "./client-status-badge";
import { Button } from "@/components/auth/auth-ui";
import {
  TableActionButton,
  TableRowActions,
} from "@/components/ui/table-row-actions";
import { useNavigationLoadingOptional } from "@/components/ui/navigation-loading";
import { getCountryName } from "@/lib/constants/countries";
import { formatDate, formatMoney } from "@/lib/utils/format";
import type { ClientStatus } from "@/lib/services/client.service";

type ClientDetailClientProps = {
  client: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    country: string;
    address: string | null;
    vatNumber: string | null;
    notes: string | null;
    totalRevenue: number;
    unpaidAmount: number;
    invoiceCount: number;
    lastCollaborationAt: Date | null;
    status: ClientStatus;
    createdAt: Date;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    currency: string;
    totalAmount: number;
    dueDate: Date;
    createdAt: Date;
    paidAt: Date | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paidAt: Date;
    invoice: { invoiceNumber: string };
  }>;
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-50 text-blue-700",
  VIEWED: "bg-indigo-50 text-indigo-700",
  PAID: "bg-green-50 text-green-700",
  OVERDUE: "bg-red-50 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export function ClientDetailClient({
  client,
  invoices,
  payments,
}: ClientDetailClientProps) {
  const router = useRouter();
  const nav = useNavigationLoadingOptional();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formValues: ClientFormValues = {
    companyName: client.companyName,
    contactName: client.contactName,
    email: client.email,
    country: client.country,
    address: client.address ?? "",
    vatNumber: client.vatNumber ?? "",
    notes: client.notes ?? "",
  };

  async function handleDelete() {
    if (
      !confirm(
        `Delete client "${client.companyName}"? This cannot be undone. Clients with invoices cannot be deleted.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to delete");
        setDeleting(false);
        return;
      }

      nav?.startNavigation();
      router.push("/clients");
      router.refresh();
    } catch {
      setError("Network error");
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-primary hover:underline">
          ← Back to clients
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {client.companyName}
            </h1>
            <ClientStatusBadge status={client.status} />
          </div>
          <p className="mt-1 text-slate-600">{client.contactName} · {client.email}</p>
        </div>
        <TableRowActions>
          <TableActionButton
            variant="edit"
            label="Edit"
            disabled={deleting}
            onClick={() => setEditOpen(true)}
          />
          <TableActionButton
            variant="delete"
            label={deleting ? "Deleting…" : "Delete"}
            disabled={deleting}
            onClick={handleDelete}
          />
        </TableRowActions>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-error">{error}</p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total revenue", value: formatMoney(client.totalRevenue) },
          { label: "Unpaid", value: formatMoney(client.unpaidAmount) },
          { label: "Invoices", value: String(client.invoiceCount) },
          {
            label: "Last collaboration",
            value: formatDate(client.lastCollaborationAt ?? client.createdAt),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="font-semibold text-slate-900">Client information</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Country</dt>
              <dd className="mt-0.5 font-medium">{getCountryName(client.country)}</dd>
            </div>
            {client.address ? (
              <div>
                <dt className="text-slate-500">Address</dt>
                <dd className="mt-0.5 whitespace-pre-wrap">{client.address}</dd>
              </div>
            ) : null}
            {client.vatNumber ? (
              <div>
                <dt className="text-slate-500">VAT Number</dt>
                <dd className="mt-0.5 font-medium">{client.vatNumber}</dd>
              </div>
            ) : null}
            {client.notes ? (
              <div>
                <dt className="text-slate-500">Notes</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{client.notes}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-100 px-6 py-4 font-semibold text-slate-900">
              Invoice history
            </h2>
            {invoices.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500">No invoice records yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-100 text-left text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Invoice No</th>
                      <th className="px-6 py-3 font-medium text-right">Amount</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-6 py-3 font-medium">{inv.invoiceNumber}</td>
                        <td className="px-6 py-3 text-right">
                          {formatMoney(inv.totalAmount, inv.currency)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              INVOICE_STATUS_COLORS[inv.status] ?? INVOICE_STATUS_COLORS.DRAFT
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-600">
                          {formatDate(inv.dueDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-100 px-6 py-4 font-semibold text-slate-900">
              Payment records
            </h2>
            {payments.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500">No payment records yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-100 text-left text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Invoice</th>
                      <th className="px-6 py-3 font-medium text-right">Amount</th>
                      <th className="px-6 py-3 font-medium">Method</th>
                      <th className="px-6 py-3 font-medium">Paid At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payments.map((pay) => (
                      <tr key={pay.id}>
                        <td className="px-6 py-3">{pay.invoice.invoiceNumber}</td>
                        <td className="px-6 py-3 text-right font-medium">
                          {formatMoney(pay.amount, pay.currency)}
                        </td>
                        <td className="px-6 py-3 text-slate-600">{pay.paymentMethod}</td>
                        <td className="px-6 py-3 text-slate-600">{formatDate(pay.paidAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <ClientFormDialog
        open={editOpen}
        mode="edit"
        clientId={client.id}
        initialValues={formValues}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          router.refresh();
          setEditOpen(false);
        }}
      />
    </>
  );
}
