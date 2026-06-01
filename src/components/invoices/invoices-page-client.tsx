"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/auth/auth-ui";
import { FormSubmitError } from "@/components/ui/form-submit-error";
import {
  TableActionButton,
  TableActionLink,
  TableRowActions,
} from "@/components/ui/table-row-actions";
import { TableLoadingOverlay } from "@/components/ui/table-loading-overlay";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { formatDate, formatMoney } from "@/lib/utils/format";
import type { InvoiceStatus } from "@prisma/client";

type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientContactName?: string;
  clientEmail?: string;
  currency: string;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: Date | string;
  invoiceDate: Date | string;
  createdAt: Date | string;
};

type InvoicesPageClientProps = {
  initialItems: InvoiceListItem[];
  initialMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function InvoicesPageClient({
  initialItems,
  initialMeta,
}: InvoicesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [meta, setMeta] = useState(initialMeta);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function canDeleteInvoice(status: InvoiceStatus) {
    return status === "DRAFT" || status === "CANCELLED";
  }

  useEffect(() => {
    const duplicated = searchParams.get("duplicated");
    if (duplicated) {
      setSuccessMessage(`Invoice ${duplicated} duplicated successfully`);
      router.replace("/invoices");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const fetchInvoices = useCallback(
    async (page: number, searchTerm: string, statusFilter: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(meta.limit),
        });
        if (searchTerm) params.set("search", searchTerm);
        if (statusFilter) params.set("status", statusFilter);

        const res = await fetch(`/api/invoices?${params}`);
        const json = await res.json();
        if (json.success) {
          setItems(json.data);
          if (json.meta) setMeta(json.meta);
        }
      } finally {
        setLoading(false);
      }
    },
    [meta.limit]
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchInvoices(1, search.trim(), status);
  }

  async function handleDeleteInvoice(inv: InvoiceListItem) {
    if (!canDeleteInvoice(inv.status)) return;

    if (!confirm(`Delete invoice ${inv.invoiceNumber}? This cannot be undone.`)) {
      return;
    }

    setActionError(null);
    setActionLoadingId(inv.id);

    try {
      const res = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setActionError(json.error ?? "Failed to delete");
        return;
      }

      fetchInvoices(meta.page, search.trim(), status);
      router.refresh();
    } catch {
      setActionError("Network error. Please try again shortly.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-600">{meta.total} invoices total</p>
        </div>

        {/* AI and manual creation actions */}
        <div className="inline-flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <Link href="/invoices/ai" className="contents">
            <button
              type="button"
              className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 via-blue-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-indigo-600 hover:to-violet-700"
            >
              <span className="text-base leading-none">✨</span>
              <span>AI Invoice</span>
              <span className="ml-1 hidden rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline">
                Smart
              </span>
            </button>
          </Link>
          <div className="my-1 w-px bg-slate-200" aria-hidden />
          <Link href="/invoices/new" className="contents">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <span className="text-base leading-none">＋</span>
              <span>Manual invoice</span>
            </button>
          </Link>
        </div>
      </div>

      {successMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-sm rounded-2xl bg-white px-8 py-7 text-center shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="duplicate-success-title"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
              ✓
            </div>
            <h2 id="duplicate-success-title" className="text-lg font-semibold text-slate-900">
              Invoice duplicated
            </h2>
            <p className="mt-2 text-sm text-slate-600">{successMessage}</p>
            <Button className="mt-5 w-full" onClick={() => setSuccessMessage(null)}>
              Got it
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input
            type="search"
            placeholder="Search number or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="app-input h-10 flex-1"
          />
          <Button type="submit" variant="outline" loading={loading} loadingText="Searching…">
            Search
          </Button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            fetchInvoices(1, search.trim(), e.target.value);
          }}
          className="app-input h-10 w-full sm:w-auto"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {actionError ? (
        <div className="mt-4">
          <FormSubmitError message={actionError} />
        </div>
      ) : null}

      <div className="app-card relative mt-6 overflow-hidden">
        {loading ? <TableLoadingOverlay label="Loading invoices…" /> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice No</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    {loading ? "Loading..." : "No invoices yet"}
                  </td>
                </tr>
              ) : (
                items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{inv.clientName}</p>
                      {inv.clientContactName ? (
                        <p className="text-xs text-slate-500">{inv.clientContactName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(inv.totalAmount, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TableRowActions>
                        <TableActionLink
                          href={`/invoices/${inv.id}`}
                          label="View"
                          icon="view"
                        />
                        {inv.status === "DRAFT" ? (
                          <TableActionLink
                            href={`/invoices/${inv.id}/edit`}
                            label="Edit"
                            icon="edit"
                          />
                        ) : null}
                        {canDeleteInvoice(inv.status) ? (
                          <TableActionButton
                            variant="delete"
                            label="Delete"
                            disabled={actionLoadingId === inv.id}
                            onClick={() => handleDeleteInvoice(inv)}
                          />
                        ) : null}
                      </TableRowActions>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {meta.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1 || loading}
              onClick={() => fetchInvoices(meta.page - 1, search.trim(), status)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => fetchInvoices(meta.page + 1, search.trim(), status)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
