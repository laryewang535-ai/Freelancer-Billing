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
              setMessage(`订阅成功！当前计划：${PLAN_LABELS[syncedPlan]}`);
            } else {
              setMessage("支付已完成，计划同步中…请稍后刷新或点击同步。");
            }
            updateSession({ plan: syncedPlan });
          } else {
            setMessage("支付已完成，计划同步中…请稍后刷新。");
          }
        })
        .catch(() => {
          setMessage("支付已完成，请刷新页面查看计划。");
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
        setError(json.error ?? "创建支付链接失败");
        return;
      }
      if (json.data.checkoutId) {
        sessionStorage.setItem("ls_checkout_id", json.data.checkoutId);
      }
      window.location.href = json.data.url;
    } catch {
      setError("网络错误");
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
        setError(json.error ?? "打开管理页失败");
        return;
      }
      window.location.href = json.data.url;
    } catch {
      setError("网络错误");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <SettingsNav />
      <h1 className="text-2xl font-semibold text-slate-900">订阅计划</h1>
      <p className="mt-1 text-sm text-slate-600">
        当前计划：
        <span className="ml-1 font-medium text-primary">
          {PLAN_LABELS[currentPlan]}
        </span>
        {status?.cancelAtPeriodEnd ? (
          <span className="ml-2 text-amber-600">（周期结束后降级）</span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        支付由 Lemon Squeezy 托管（含全球税务）
      </p>

      {status?.currentPeriodEnd ? (
        <p className="mt-1 text-sm text-slate-500">
          当前周期至 {new Date(status.currentPeriodEnd).toLocaleDateString("zh-CN")}
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
          Lemon Squeezy 尚未配置。在 .env.local 填入 API Key、Store ID、Variant ID，
          详见项目文档或运行 <code className="font-mono">npm run ls:check</code>。
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="mt-1 text-2xl font-bold">$0</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>每月 10 张 Invoice</li>
            <li>Standard 模板</li>
            <li>基础客户与收款管理</li>
          </ul>
          {currentPlan === "FREE" ? (
            <p className="mt-4 text-sm font-medium text-primary">当前计划</p>
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
                <p className="mt-4 text-sm font-medium text-primary">当前计划</p>
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
