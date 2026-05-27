"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/auth/auth-ui";
import { FormSubmitError } from "@/components/ui/form-submit-error";
import { CURRENCIES } from "@/lib/constants/currencies";
import { INVOICE_TEMPLATES, PAPER_SIZES } from "@/lib/constants/invoice-templates";
import { getAllowedTemplates } from "@/lib/billing/template-access";
import { defaultLineItems } from "@/lib/utils/invoice-defaults";
import { toDateInputValue } from "@/lib/utils/date-input";
import { calcInvoiceTotals } from "@/lib/utils/invoice-calc";
import { formatMoney } from "@/lib/utils/format";
import {
  InvoicePreview,
  type PreviewClient,
  type PreviewItem,
  type PreviewSeller,
} from "@/components/invoices/invoice-preview";
import { LineItemsEditor } from "@/components/invoices/line-items-editor";
import type { InvoiceTemplate, PaperSize, Plan } from "@prisma/client";

type ClientOption = { id: string; companyName: string };

type AiResult = {
  clientHint: string;
  currency: string;
  taxRatePercent: number;
  dueInDays: number;
  paymentTerms: string;
  notes: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
};

type AiInvoiceClientProps = {
  previewNumber: string;
  seller: PreviewSeller;
  clients: ClientOption[];
  clientsMap: Record<string, PreviewClient>;
  userPlan: Plan;
};

function dueDateFromDays(days: number): string {
  const due = new Date();
  due.setDate(due.getDate() + days);
  return toDateInputValue(due);
}

function matchClientId(clients: ClientOption[], hint: string): string {
  const normalized = hint.trim().toLowerCase();
  if (!normalized) return "";
  const match = clients.find((c) =>
    c.companyName.toLowerCase().includes(normalized)
  );
  return match?.id ?? "";
}

export function AiInvoiceClient({
  previewNumber,
  seller,
  clients,
  clientsMap,
  userPlan,
}: AiInvoiceClientProps) {
  const router = useRouter();
  const allowedTemplates = getAllowedTemplates(userPlan);

  const [prompt, setPrompt] = useState(
    "Create an invoice for Google for website development, $3000 USD, due in 30 days"
  );
  const [generated, setGenerated] = useState(false);
  const [clientId, setClientId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [taxRatePercent, setTaxRatePercent] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PreviewItem[]>(defaultLineItems());

  const [template, setTemplate] = useState<InvoiceTemplate>("STANDARD");
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#2563EB");
  const [brandLogoUrl, setBrandLogoUrl] = useState(seller.logoUrl ?? "");
  const [footerSignature, setFooterSignature] = useState("");

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const client = clientId ? clientsMap[clientId] ?? null : null;
  const totals = useMemo(
    () => calcInvoiceTotals(items, taxRatePercent),
    [items, taxRatePercent]
  );

  function handleTemplateChange(value: InvoiceTemplate) {
    if (!allowedTemplates.includes(value)) {
      setTemplateError("该模板需要 Pro 计划，请前往设置 → 订阅计划升级");
      return;
    }
    setTemplateError(null);
    setTemplate(value);
  }

  function applyAiResult(data: AiResult) {
    setClientId(matchClientId(clients, data.clientHint));
    setCurrency(data.currency || "USD");
    setTaxRatePercent(data.taxRatePercent ?? 0);
    setDueDate(dueDateFromDays(data.dueInDays ?? 30));
    setPaymentTerms(data.paymentTerms || "Net 30");
    setNotes(data.notes ?? "");
    setItems(data.items?.length ? data.items : defaultLineItems());
    setGenerated(true);
  }

  async function generate() {
    setLoading(true);
    setGenerateError(null);
    setGenerated(false);

    try {
      const res = await fetch("/api/ai/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setGenerateError(json.error ?? "生成失败");
        return;
      }
      applyAiResult(json.data);
    } catch {
      setGenerateError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  async function createInvoice() {
    setSubmitError(null);

    if (!clientId) {
      setSubmitError("请选择客户");
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setSubmitError("请填写所有行项目描述");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          currency,
          taxRatePercent,
          dueDate: new Date(dueDate).toISOString(),
          paymentTerms: paymentTerms || null,
          notes: notes || null,
          template,
          paperSize,
          brandPrimaryColor: template === "BRANDING" ? brandPrimaryColor : null,
          brandLogoUrl: template === "BRANDING" ? brandLogoUrl || null : null,
          footerSignature:
            template === "BRANDING" ? footerSignature || null : null,
          items,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSubmitError(json.error ?? "创建失败");
        setCreating(false);
        return;
      }
      router.push(`/invoices/${json.data.id}/edit`);
    } catch {
      setSubmitError("网络错误");
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/invoices" className="text-sm text-primary hover:underline">
          ← 返回 Invoice 列表
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600 text-lg text-white shadow-md">
          ✨
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">AI Invoice</h1>
          <p className="mt-1 text-sm text-slate-600">
            用自然语言描述，生成后可选择模板与版式，确认无误再创建
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-3xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">
            描述你的工作
          </label>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="例如：为 Google 开一张网站开发发票，3000 美元，30 天付款"
          />
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={generate} disabled={loading}>
                {loading ? "生成中..." : "✨ Generate Invoice"}
              </Button>
              {generated ? (
                <span className="text-xs text-emerald-600">
                  ✓ 已根据描述填充下方表单，可继续修改
                </span>
              ) : null}
            </div>
            <FormSubmitError message={generateError} />
          </div>
        </div>
      </div>

      {generated ? (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="space-y-6">
            {/* 模板与版式 */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-medium text-slate-900">模板与版式</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {INVOICE_TEMPLATES.map((t) => {
                  const locked = !allowedTemplates.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => handleTemplateChange(t.value)}
                      className={`rounded-lg border p-3 text-left text-sm transition ${
                        template === t.value
                          ? "border-primary bg-blue-50 ring-2 ring-primary/20"
                          : locked
                            ? "border-slate-200 bg-slate-50 opacity-70"
                            : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="font-medium text-slate-900">
                        {t.label}
                        {locked ? (
                          <span className="ml-1 text-xs text-amber-600">Pro</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700">
                  纸张规格
                </label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                >
                  {PAPER_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              {template === "BRANDING" ? (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      品牌主色
                    </label>
                    <div className="mt-1 flex items-center gap-3">
                      <input
                        type="color"
                        value={brandPrimaryColor}
                        onChange={(e) => setBrandPrimaryColor(e.target.value)}
                        className="h-11 w-14 cursor-pointer rounded border border-slate-300"
                      />
                      <input
                        value={brandPrimaryColor}
                        onChange={(e) => setBrandPrimaryColor(e.target.value)}
                        className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Logo URL
                    </label>
                    <input
                      value={brandLogoUrl}
                      onChange={(e) => setBrandLogoUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      页脚签名
                    </label>
                    <input
                      value={footerSignature}
                      onChange={(e) => setFooterSignature(e.target.value)}
                      placeholder="Thank you for your business"
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    />
                  </div>
                </div>
              ) : null}
              <FormSubmitError message={templateError} />
            </section>

            {/* 客户与条款 */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-medium text-slate-900">客户与条款</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    客户
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      币种
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      税率 (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={taxRatePercent}
                      onChange={(e) =>
                        setTaxRatePercent(Number(e.target.value) || 0)
                      }
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      到期日
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      付款条款
                    </label>
                    <input
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    备注
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </section>

            {/* 行项目 */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-medium text-slate-900">行项目</h2>
              <LineItemsEditor items={items} onChange={setItems} />
              <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 text-sm">
                <span className="text-slate-600">合计：</span>
                <span className="ml-2 font-semibold text-slate-900">
                  {formatMoney(totals.totalAmount, currency)}
                </span>
              </div>
            </section>

            <div className="space-y-2">
              <FormSubmitError message={submitError} />
              <div className="flex flex-wrap gap-3">
              <Button onClick={createInvoice} disabled={creating}>
                {creating ? "创建中..." : "创建 Draft Invoice"}
              </Button>
              <Button
                variant="outline"
                onClick={generate}
                disabled={loading}
              >
                重新生成
              </Button>
              </div>
            </div>
          </div>

          {/* 预览 */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">实时预览</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {paperSize === "LETTER" ? "Letter" : "A4"}
              </span>
            </div>
            <InvoicePreview
              invoiceNumber={previewNumber}
              invoiceDate={new Date()}
              dueDate={dueDate}
              currency={currency}
              taxRatePercent={taxRatePercent}
              paymentTerms={paymentTerms}
              notes={notes}
              template={template}
              paperSize={paperSize}
              brandPrimaryColor={brandPrimaryColor}
              brandLogoUrl={brandLogoUrl}
              footerSignature={footerSignature}
              client={client}
              seller={seller}
              items={items}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
