"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/auth/auth-ui";
import { buildDefaultInvoiceMessage } from "@/lib/email/invoice-message";
import { formatMoney } from "@/lib/utils/format";

export type SendInvoiceClientOption = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
};

type SendInvoiceDialogProps = {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  currency: string;
  totalAmount: number;
  dueDate: Date | string;
  sellerName: string;
  defaultClientId: string;
  clients: SendInvoiceClientOption[];
  onSent: () => void;
};

/** Send invoice email弹窗：选择Client + 编辑正文 */
export function SendInvoiceDialog({
  open,
  onClose,
  invoiceId,
  invoiceNumber,
  currency,
  totalAmount,
  dueDate,
  sellerName,
  defaultClientId,
  clients,
  onSent,
}: SendInvoiceDialogProps) {
  const [clientId, setClientId] = useState(defaultClientId);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClientId(defaultClientId);
    setError(null);
    const client = clients.find((c) => c.id === defaultClientId);
    if (client) {
      setMessage(
        buildDefaultInvoiceMessage({
          contactName: client.contactName,
          invoiceNumber,
          totalAmount,
          currency,
          dueDate,
          sellerName,
        })
      );
    }
  }, [open, defaultClientId, clients, invoiceNumber, totalAmount, currency, dueDate, sellerName]);

  function handleClientChange(newClientId: string) {
    setClientId(newClientId);
    const client = clients.find((c) => c.id === newClientId);
    if (client) {
      setMessage(
        buildDefaultInvoiceMessage({
          contactName: client.contactName,
          invoiceNumber,
          totalAmount,
          currency,
          dueDate,
          sellerName,
        })
      );
    }
  }

  if (!open) return null;

  async function handleSend() {
    if (!clientId) {
      setError("Please select a recipient client");
      return;
    }
    if (!message.trim()) {
      setError("Please enter an email message");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          clientId,
          message: message.trim(),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to send");
        setLoading(false);
        return;
      }

      onSent();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-invoice-title"
      >
        <h2 id="send-invoice-title" className="text-lg font-semibold text-slate-900">
          Send invoice email
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {invoiceNumber} · {formatMoney(totalAmount, currency)} · PDF invoice attached
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Recipient client</label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} — {c.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email message</label>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Enter the message to send to your client..."
            />
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-error">{error}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSend} loading={loading} loadingText="Sending…">
            Send email
          </Button>
        </div>
      </div>
    </div>
  );
}
