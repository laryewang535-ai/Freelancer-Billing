"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/auth/auth-ui";
import { InvoicePreview, type PreviewClient, type PreviewSeller } from "./invoice-preview";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { InvoiceTimeline } from "./invoice-timeline";
import { useNavigationLoadingOptional } from "@/components/ui/navigation-loading";
import {
  SendInvoiceDialog,
  type SendInvoiceClientOption,
} from "./send-invoice-dialog";
import { formatDate, formatMoney } from "@/lib/utils/format";
import type { InvoiceStatus, InvoiceActivityType } from "@prisma/client";

type InvoiceDetailClientProps = {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    currency: string;
    totalAmount: number;
    taxRatePercent: number;
    dueDate: Date | string;
    invoiceDate: Date | string;
    paymentTerms: string | null;
    notes: string | null;
    client: PreviewClient & { id: string };
    user: PreviewSeller;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
    activities: Array<{
      id: string;
      type: InvoiceActivityType;
      message: string | null;
      createdAt: Date | string;
    }>;
  };
  clients: SendInvoiceClientOption[];
  sellerName: string;
  emailConfigured: boolean;
  openSendDialog?: boolean;
};

export function InvoiceDetailClient({
  invoice,
  clients,
  sellerName,
  emailConfigured,
  openSendDialog = false,
}: InvoiceDetailClientProps) {
  const router = useRouter();
  const nav = useNavigationLoadingOptional();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(openSendDialog);

  const isDraft = invoice.status === "DRAFT";
  const canSend = invoice.status === "DRAFT";
  const canMarkPaid = ["SENT", "VIEWED", "OVERDUE"].includes(invoice.status);
  const canCancel = ["DRAFT", "SENT", "VIEWED", "OVERDUE"].includes(invoice.status);
  const canDelete = ["DRAFT", "CANCELLED"].includes(invoice.status);

  async function runAction(action: string) {
    setLoading(action);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Action failed");
        setLoading(null);
        return;
      }

      if (action === "duplicate") {
        const number = json.data?.invoiceNumber as string | undefined;
        nav?.startNavigation();
        router.push(number ? `/invoices?duplicated=${encodeURIComponent(number)}` : "/invoices");
        return;
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete invoice ${invoice.invoiceNumber}?`)) return;
    setLoading("delete");
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to delete");
        setLoading(null);
        return;
      }
      nav?.startNavigation();
      router.push("/invoices");
    } catch {
      setError("Network error");
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/invoices" className="text-sm text-primary hover:underline">
          ← Back to invoices
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {invoice.invoiceNumber}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-slate-600">
            {invoice.client.companyName} · {formatMoney(invoice.totalAmount, invoice.currency)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft ? (
            <Link href={`/invoices/${invoice.id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
          ) : null}
          {canSend ? (
            <Button
              disabled={loading === "send" || !emailConfigured}
              onClick={() => setSendOpen(true)}
              title={
                emailConfigured
                  ? undefined
                  : "Configure Resend in .env.local first (RESEND_API_KEY + RESEND_FROM_EMAIL)."
              }
            >
              Send Invoice
            </Button>
          ) : null}
          {canMarkPaid ? (
            <Button
              variant="secondary"
              loading={loading === "markPaid"}
              loadingText="Processing…"
              onClick={() => runAction("markPaid")}
            >
              Mark Paid
            </Button>
          ) : null}
          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" type="button">
              Download PDF
            </Button>
          </a>
          <a href={`/api/invoices/${invoice.id}/docx`} target="_blank" rel="noreferrer">
            <Button variant="outline" type="button">
              Download DOCX
            </Button>
          </a>
          <Button
            variant="outline"
            loading={loading === "duplicate"}
            loadingText="Duplicating…"
            onClick={() => runAction("duplicate")}
          >
            Duplicate
          </Button>
          {canCancel ? (
            <Button
              variant="outline"
              loading={loading === "cancel"}
              loadingText="Cancelling…"
              onClick={() => runAction("cancel")}
            >
              Cancel
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="outline"
              loading={loading === "delete"}
              loadingText="Deleting…"
              className="border-red-200 text-error hover:bg-red-50"
              onClick={handleDelete}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {canSend && !emailConfigured ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Email is not configured: set <code className="text-xs">.env.local</code> in {" "}
          <strong>RESEND_API_KEY</strong> and <strong>RESEND_FROM_EMAIL</strong>。
          For local testing, you can use <code className="text-xs">onboarding@resend.dev</code>。
        </p>
      ) : null}

      {canSend && emailConfigured ? (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Resend is ready: platform email is shared across users, the sender name uses your company/name, and client replies go to your login email.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-error">{error}</p>
      ) : null}

      <div className="mt-4 flex gap-6 text-sm text-slate-600">
        <span>Due: {formatDate(invoice.dueDate)}</span>
        <span>Date: {formatDate(invoice.invoiceDate)}</span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InvoicePreview
            invoiceNumber={invoice.invoiceNumber}
            invoiceDate={invoice.invoiceDate}
            dueDate={invoice.dueDate}
            currency={invoice.currency}
            taxRatePercent={invoice.taxRatePercent}
            paymentTerms={invoice.paymentTerms}
            notes={invoice.notes}
            client={invoice.client}
            seller={invoice.user}
            items={invoice.items}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Activity Timeline</h2>
          <div className="mt-4">
            <InvoiceTimeline activities={invoice.activities} />
          </div>
        </div>
      </div>

      <SendInvoiceDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        currency={invoice.currency}
        totalAmount={invoice.totalAmount}
        dueDate={invoice.dueDate}
        sellerName={sellerName}
        defaultClientId={invoice.client.id}
        clients={clients}
        onSent={() => router.refresh()}
      />
    </div>
  );
}
