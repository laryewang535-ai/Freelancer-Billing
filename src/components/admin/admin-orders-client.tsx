"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/auth/auth-ui";

type Provider = "GUMROAD" | "PATREON" | "BUY_ME_A_COFFEE" | "OTHER";
type OrderAction =
  | "ACTIVATED"
  | "RENEWED"
  | "CANCEL_AT_PERIOD_END"
  | "REFUNDED"
  | "REVOKED";

type Order = {
  id: string;
  provider: Provider;
  externalOrderId: string;
  purchaserEmail: string | null;
  productName: string | null;
  plan: "FREE" | "PRO" | "BUSINESS";
  periodMonths: number;
  amount: string | null;
  currency: string | null;
  purchasedAt: string | null;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  notes: string | null;
  processedAt: string | null;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
  user: { email: string; name: string | null };
  actions: Array<{
    id: string;
    type: string;
    note: string | null;
    performedBy: string;
    createdAt: string;
  }>;
};

const PROVIDER_LABELS: Record<Provider, string> = {
  GUMROAD: "Gumroad",
  PATREON: "Patreon",
  BUY_ME_A_COFFEE: "Buy Me a Coffee",
  OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending verification",
  ACTIVATED: "Activated",
  RENEWED: "Renewed",
  CANCEL_AT_PERIOD_END: "Ends at period end",
  REFUNDED: "Refunded",
  REVOKED: "Revoked",
};

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("en-US") : "-";
}

export function AdminOrdersClient({
  initialOrders,
  databaseSetupRequired = false,
  databaseSetupError = null,
}: {
  initialOrders: Order[];
  databaseSetupRequired?: boolean;
  databaseSetupError?: string | null;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createOrder(formData: FormData) {
    setCreating(true);
    setError(null);
    setMessage(null);

    const payload = Object.fromEntries(formData.entries());
    try {
      const response = await fetch("/api/admin/external-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setError(json.error ?? "Could not record order");
        return;
      }
      setMessage("Order recorded. Verify it, then activate the entitlement.");
      (document.getElementById("external-order-form") as HTMLFormElement | null)?.reset();
      router.refresh();
    } catch {
      setError("Network error while recording the order");
    } finally {
      setCreating(false);
    }
  }

  async function initializeOrderTables() {
    setInitializing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/external-orders/setup", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setError(json.error ?? "Could not initialize order tables");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error while initializing order tables");
    } finally {
      setInitializing(false);
    }
  }

  async function runAction(orderId: string, action: OrderAction) {
    const actionLabel = {
      ACTIVATED: "activate",
      RENEWED: "renew",
      CANCEL_AT_PERIOD_END: "mark to end at period end",
      REFUNDED: "refund and revoke",
      REVOKED: "revoke",
    }[action];
    if (!window.confirm(`Confirm: ${actionLabel} this order?`)) return;

    setActing(`${orderId}:${action}`);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/external-orders/${orderId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setError(json.error ?? "Could not update order");
        return;
      }
      setMessage("Order and entitlement updated.");
      router.refresh();
    } catch {
      setError("Network error while updating the order");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">External orders</h1>
        <p className="mt-1 text-sm text-slate-600">
          Verify purchases from external platforms, then manage app entitlements here.
        </p>
      </div>

      {message ? <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      {databaseSetupRequired ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p>The external-order tables are not initialized yet.</p>
          <Button type="button" size="sm" variant="outline" loading={initializing} loadingText="Initializing..." onClick={initializeOrderTables}>
            Initialize order tables
          </Button>
          {databaseSetupError ? <p className="w-full break-words text-xs text-amber-800">{databaseSetupError}</p> : null}
        </div>
      ) : null}

      <section className="border-y border-slate-200 py-6">
        <h2 className="text-lg font-semibold text-slate-900">Record verified purchase</h2>
        <form
          id="external-order-form"
          className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          action={(formData) => createOrder(formData)}
          aria-disabled={databaseSetupRequired}
        >
          <Input label="App account email" name="userEmail" type="email" required />
          <Input label="Platform order ID" name="externalOrderId" required />
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Platform</span>
            <select name="provider" defaultValue="GUMROAD" className="app-input w-full">
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Plan</span>
            <select name="plan" defaultValue="PRO" className="app-input w-full">
              <option value="PRO">Pro</option>
            </select>
          </label>
          <Input label="Buyer email (optional)" name="purchaserEmail" type="email" />
          <Input label="Product name (optional)" name="productName" />
          <Input label="Amount (optional)" name="amount" type="number" min="0" step="0.01" />
          <Input label="Currency (optional)" name="currency" maxLength={3} placeholder="USD" />
          <Input label="Purchase date (optional)" name="purchasedAt" type="date" />
          <Input label="Months" name="periodMonths" type="number" min="1" max="24" defaultValue="1" required />
          <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
            <span>Internal note (optional)</span>
            <textarea name="notes" rows={1} className="app-input w-full" />
          </label>
          <div className="flex items-end">
            <Button type="submit" loading={creating} loadingText="Recording..." disabled={databaseSetupRequired} className="w-full">
              Record order
            </Button>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
          <span className="text-sm text-slate-500">Latest {initialOrders.length}</span>
        </div>
        <div className="overflow-x-auto border border-slate-200">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Period end</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {initialOrders.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No external orders yet.</td></tr>
              ) : initialOrders.map((order) => (
                <tr key={order.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{order.user.email}</p>
                    {order.purchaserEmail ? <p className="mt-1 text-xs text-slate-500">Buyer: {order.purchaserEmail}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{PROVIDER_LABELS[order.provider]}</p>
                    <p className="mt-1 max-w-48 break-all text-xs text-slate-500">{order.externalOrderId}</p>
                    {order.productName ? <p className="mt-1 text-xs text-slate-500">{order.productName}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <p>{order.plan}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.periodMonths} month(s)</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{dateTime(order.periodEnd)}</td>
                  <td className="px-4 py-3"><span className="font-medium text-slate-700">{STATUS_LABELS[order.status] ?? order.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(["ACTIVATED", "RENEWED", "CANCEL_AT_PERIOD_END", "REFUNDED", "REVOKED"] as const).map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant={action === "REFUNDED" || action === "REVOKED" ? "outline" : "secondary"}
                          loading={acting === `${order.id}:${action}`}
                          onClick={() => runAction(order.id, action)}
                        >
                          {{ ACTIVATED: "Activate", RENEWED: "Renew", CANCEL_AT_PERIOD_END: "End at expiry", REFUNDED: "Refund", REVOKED: "Revoke" }[action]}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
