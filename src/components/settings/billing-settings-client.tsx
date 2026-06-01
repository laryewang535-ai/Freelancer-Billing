"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/auth/auth-ui";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PLAN_CATALOG } from "@/lib/lemonsqueezy/plans";
import type { Plan } from "@prisma/client";

const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Free",
  PRO: "Pro",
  BUSINESS: "Business",
};

type BillingStatus = {
  plan: Plan;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  billingConfigured: boolean;
};

export function BillingSettingsClient({ initialPlan }: { initialPlan: Plan }) {
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      const checkoutId = sessionStorage.getItem("ls_checkout_id");
      sessionStorage.removeItem("ls_checkout_id");

      fetch("/api/billing/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: checkoutId ?? undefined }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setStatus(json.data);
            const syncedPlan = json.data?.plan as Plan | undefined;
            if (syncedPlan && syncedPlan !== "FREE") {
              setMessage(`Subscription active. Current plan: ${PLAN_LABELS[syncedPlan]}`);
            } else {
              setMessage("Payment completed. Your plan is syncing; refresh shortly or sync again.");
            }
            updateSession({ plan: syncedPlan });
          } else {
            setMessage("Payment completed. Your plan is syncing; please refresh shortly.");
          }
        })
        .catch(() => {
          setMessage("Payment completed. Please refresh to see your plan.");
        });
    }
  }, [searchParams, updateSession]);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStatus(json.data);
      })
      .catch(() => {});
  }, []);

  const currentPlan = status?.plan ?? initialPlan;

  async function checkout(plan: "PRO" | "BUSINESS") {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to create checkout link");
        return;
      }
      if (json.data.checkoutId) {
        sessionStorage.setItem("ls_checkout_id", json.data.checkoutId);
      }
      window.location.href = json.data.url;
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to open billing portal");
        return;
      }
      window.location.href = json.data.url;
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <SettingsNav />
      <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
      <p className="mt-1 text-sm text-slate-600">
        Current plan:
        <span className="ml-1 font-medium text-primary">
          {PLAN_LABELS[currentPlan]}
        </span>
        {status?.cancelAtPeriodEnd ? (
          <span className="ml-2 text-amber-600">(downgrades at period end)</span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Payments are hosted by Lemon Squeezy, including global tax handling.
      </p>

      {status?.currentPeriodEnd ? (
        <p className="mt-1 text-sm text-slate-500">
          Current period ends {new Date(status.currentPeriodEnd).toLocaleDateString("en-US")}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-error">{error}</p>
      ) : null}

      {!status?.billingConfigured ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Lemon Squeezy is not configured. Add the API key, Store ID, and Variant IDs to .env.local, or run <code className="font-mono">npm run ls:check</code>.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="mt-1 text-2xl font-bold">$0</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>10 invoices per month</li>
            <li>Standard template</li>
            <li>Basic client and payment tracking</li>
          </ul>
          {currentPlan === "FREE" ? (
            <p className="mt-4 text-sm font-medium text-primary">Current plan</p>
          ) : null}
        </div>

        {(["PRO", "BUSINESS"] as const).map((planKey) => {
          const plan = PLAN_CATALOG[planKey];
          const isCurrent = currentPlan === planKey;

          return (
            <div
              key={planKey}
              className={`rounded-xl border bg-white p-6 shadow-sm ${
                isCurrent ? "border-primary ring-2 ring-primary/20" : "border-slate-200"
              }`}
            >
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-2xl font-bold">{plan.priceLabel}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {plan.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <p className="mt-4 text-sm font-medium text-primary">Current plan</p>
              ) : (
                <Button
                  className="mt-4 w-full"
                  disabled={!status?.billingConfigured}
                  loading={loading === planKey}
                  loadingText="Redirecting…"
                  onClick={() => checkout(planKey)}
                >
                  Upgrade to {plan.name}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {currentPlan !== "FREE" && status?.billingConfigured ? (
        <div className="mt-8">
          <Button
            variant="outline"
            onClick={openPortal}
            loading={loading === "portal"}
            loadingText="Opening…"
          >
            Manage subscription
          </Button>
        </div>
      ) : null}
    </>
  );
}
