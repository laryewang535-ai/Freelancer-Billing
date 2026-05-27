"use client";

import { useState } from "react";
import { Button } from "@/components/auth/auth-ui";

const RULE_LABELS: Record<string, string> = {
  BEFORE_7_DAYS: "到期前 7 天",
  BEFORE_3_DAYS: "到期前 3 天",
  ON_DUE_DATE: "到期当天",
  OVERDUE_7_DAYS: "逾期 7 天",
  OVERDUE_14_DAYS: "逾期 14 天",
};

type Rule = { id: string; type: string; enabled: boolean };

export function ReminderSettingsClient({ initialRules }: { initialRules: Rule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(type: string) {
    setRules((prev) =>
      prev.map((r) => (r.type === type ? { ...r, enabled: !r.enabled } : r))
    );
  }

  async function save() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/reminders/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules.map((r) => ({ type: r.type, enabled: r.enabled })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "保存失败");
      } else {
        setMessage("已保存");
        setRules(json.data);
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">催款设置</h1>
      <p className="mt-1 text-sm text-slate-600">Pro 计划可启用 5 档自动催款规则</p>

      <ul className="mt-6 space-y-3">
        {rules.map((rule) => (
          <li
            key={rule.type}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <span className="text-sm font-medium">
              {RULE_LABELS[rule.type] ?? rule.type}
            </span>
            <button
              type="button"
              onClick={() => toggle(rule.type)}
              className={`relative h-6 w-11 rounded-full transition ${
                rule.enabled ? "bg-primary" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  rule.enabled ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-error">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      ) : null}

      <Button className="mt-6" onClick={save} loading={loading} loadingText="Saving…">
        Save settings
      </Button>
    </>
  );
}
