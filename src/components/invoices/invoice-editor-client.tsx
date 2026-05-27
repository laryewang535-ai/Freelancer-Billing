"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/auth/auth-ui";
import { FormSubmitError } from "@/components/ui/form-submit-error";
import { useNavigationLoadingOptional } from "@/components/ui/navigation-loading";
import { CURRENCIES } from "@/lib/constants/currencies";
import { INVOICE_TEMPLATES, PAPER_SIZES } from "@/lib/constants/invoice-templates";
import { getAllowedTemplates } from "@/lib/billing/template-access";
import { calcInvoiceTotals } from "@/lib/utils/invoice-calc";
import { formatMoney } from "@/lib/utils/format";
import {
  InvoicePreview,
  type PreviewClient,
  type PreviewItem,
  type PreviewSeller,
} from "./invoice-preview";
import { LineItemsEditor } from "./line-items-editor";
import { defaultDueDate } from "@/lib/utils/date-input";
import { defaultLineItems } from "@/lib/utils/invoice-defaults";
import type { InvoiceTemplate, PaperSize, Plan } from "@prisma/client";

type ClientOption = { id: string; companyName: string };

type InvoiceEditorClientProps = {
  mode: "create" | "edit";
  invoiceId?: string;
  previewNumber: string;
  seller: PreviewSeller;
  clients: ClientOption[];
  clientsMap: Record<string, PreviewClient>;
  userPlan: Plan;
  initial?: {
    clientId: string;
    currency: string;
    taxRatePercent: number;
    dueDate: string;
    paymentTerms?: string | null;
    notes?: string | null;
    template?: InvoiceTemplate;
    paperSize?: PaperSize;
    brandPrimaryColor?: string | null;
    brandLogoUrl?: string | null;
    footerSignature?: string | null;
    items: PreviewItem[];
  };
};

export function InvoiceEditorClient({
  mode,
  invoiceId,
  previewNumber,
  seller,
  clients,
  clientsMap,
  userPlan,
  initial,
}: InvoiceEditorClientProps) {
  const router = useRouter();
  const nav = useNavigationLoadingOptional();
  const allowedTemplates = getAllowedTemplates(userPlan);

  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [taxRatePercent, setTaxRatePercent] = useState(initial?.taxRatePercent ?? 0);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? defaultDueDate());
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? "Net 30");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [template, setTemplate] = useState<InvoiceTemplate>(
    initial?.template && allowedTemplates.includes(initial.template)
      ? initial.template
      : "STANDARD"
  );
  const [paperSize, setPaperSize] = useState<PaperSize>(initial?.paperSize ?? "A4");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(
    initial?.brandPrimaryColor ?? "#2563EB"
  );
  const [brandLogoUrl, setBrandLogoUrl] = useState(initial?.brandLogoUrl ?? seller.logoUrl ?? "");
  const [footerSignature, setFooterSignature] = useState(initial?.footerSignature ?? "");
  const [items, setItems] = useState<PreviewItem[]>(
    initial?.items?.length ? initial.items : defaultLineItems()
  );
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function saveDraft() {
    await submit(false);
  }

  async function saveAndSend() {
    await submit(true);
  }

  function handleCancel() {
    router.back();
  }

  async function submit(andSend: boolean) {
    setSubmitError(null);

    if (!clientId) {
      setSubmitError("请选择客户");
      return;
    }

    if (items.some((i) => !i.description.trim())) {
      setSubmitError("请填写所有行项目描述");
      return;
    }

    setLoading(true);

    const payload = {
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
      footerSignature: template === "BRANDING" ? footerSignature || null : null,
      items,
    };

    try {
      const url = mode === "create" ? "/api/invoices" : `/api/invoices/${invoiceId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setSubmitError(json.error ?? "保存失败");
        setLoading(false);
        return;
      }

      const id = mode === "create" ? json.data.id : invoiceId;

      nav?.startNavigation();
      if (andSend && id) {
        router.push(`/invoices/${id}?send=1`);
        return;
      }

      router.push(`/invoices/${id}`);
      router.refresh();
    } catch {
      setSubmitError("网络错误");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/invoices" className="text-sm text-primary hover:underline">
          ← 返回 Invoice 列表
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-slate-900">
        {mode === "create" ? "创建 Invoice" : "编辑 Invoice"}
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-medium text-slate-900">模板与格式</h2>
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
                    <p className="mt-1 text-xs text-slate-500">{t.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">纸张规格</label>
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
                  <label className="block text-sm font-medium text-slate-700">品牌主色</label>
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
                  <label className="block text-sm font-medium text-slate-700">Logo URL</label>
                  <input
                    value={brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">页脚签名</label>
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

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-medium text-slate-900">Client</h2>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select Client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-medium text-slate-900">Items</h2>
            <LineItemsEditor items={items} onChange={setItems} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Currency</label>
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
                Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(Number(e.target.value) || 0)}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Payment Terms
              </label>
              <input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </section>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatMoney(totals.totalAmount, currency)}</span>
            </div>
          </div>

          <FormSubmitError message={submitError} />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={saveDraft}
              loading={loading || (nav?.isNavigating ?? false)}
              loadingText="Saving…"
            >
              Save Draft
            </Button>
            <Button
              variant="secondary"
              onClick={saveAndSend}
              loading={loading || (nav?.isNavigating ?? false)}
              loadingText="Saving…"
            >
              Send Invoice
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={handleCancel}
              disabled={loading || (nav?.isNavigating ?? false)}
            >
              Cancel
            </Button>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 text-sm font-medium text-slate-600">Preview</p>
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
    </div>
  );
}
