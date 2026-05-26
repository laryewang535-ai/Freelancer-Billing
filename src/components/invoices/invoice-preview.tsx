import { formatDate, formatMoney } from "@/lib/utils/format";
import { getCountryName } from "@/lib/constants/countries";
import { calcInvoiceTotals } from "@/lib/utils/invoice-calc";
import type { InvoiceTemplate, PaperSize } from "@prisma/client";
import { cn } from "@/lib/utils/cn";

export type PreviewClient = {
  companyName: string;
  contactName: string;
  email: string;
  country: string;
  address?: string | null;
  vatNumber?: string | null;
};

export type PreviewSeller = {
  companyName?: string | null;
  name?: string | null;
  email?: string | null;
  website?: string | null;
  phone?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type PreviewItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoicePreviewProps = {
  invoiceNumber: string;
  invoiceDate?: Date | string;
  dueDate?: Date | string;
  currency: string;
  taxRatePercent: number;
  paymentTerms?: string | null;
  notes?: string | null;
  template?: InvoiceTemplate;
  paperSize?: PaperSize;
  brandPrimaryColor?: string | null;
  brandLogoUrl?: string | null;
  footerSignature?: string | null;
  client?: PreviewClient | null;
  seller: PreviewSeller;
  items: PreviewItem[];
};

/** 将 #RRGGBB 转为 rgba(r,g,b,alpha) */
function hexToRgba(hex: string, alpha = 1): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return hex;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolveAccent(
  template: InvoiceTemplate,
  brandColor?: string | null
): string {
  if (template === "BRANDING" && brandColor) return brandColor;
  if (template === "MINIMAL") return "#0F172A";
  if (template === "CORPORATE") return "#1E293B";
  return "#2563EB";
}

export function InvoicePreview({
  invoiceNumber,
  invoiceDate,
  dueDate,
  currency,
  taxRatePercent,
  paymentTerms,
  notes,
  template = "STANDARD",
  paperSize = "A4",
  brandPrimaryColor,
  brandLogoUrl,
  footerSignature,
  client,
  seller,
  items,
}: InvoicePreviewProps) {
  const totals = calcInvoiceTotals(items, taxRatePercent);
  const sellerName = seller.companyName || seller.name || "Your Company";
  const accent = resolveAccent(template, brandPrimaryColor);
  const accentSoft = hexToRgba(accent, 0.08);
  const accentRing = hexToRgba(accent, 0.16);
  const logo = brandLogoUrl || seller.logoUrl;
  const sellerLines = [
    seller.address,
    [seller.city, seller.state, seller.postalCode].filter(Boolean).join(", "),
    seller.country ? getCountryName(seller.country) : null,
  ].filter(Boolean) as string[];

  const isCorporate = template === "CORPORATE";
  const isMinimal = template === "MINIMAL";
  const isBranding = template === "BRANDING";
  const isStandard = template === "STANDARD";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white text-slate-800 shadow-lg ring-1 ring-slate-900/5",
        paperSize === "LETTER" ? "aspect-[8.5/11]" : "aspect-[210/297]",
        isMinimal ? "border-slate-200" : "border-slate-100"
      )}
    >
      {/* 顶部装饰条 */}
      {isStandard ? (
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{
            background: `linear-gradient(90deg, ${accent} 0%, ${hexToRgba(accent, 0.6)} 60%, ${hexToRgba(accent, 0.25)} 100%)`,
          }}
        />
      ) : null}
      {isBranding ? (
        <>
          <div
            className="absolute inset-x-0 top-0 h-2"
            style={{ backgroundColor: accent }}
          />
          <div
            className="absolute left-0 top-0 h-full w-1.5"
            style={{ backgroundColor: accent }}
          />
        </>
      ) : null}

      {/* Corporate 深色页眉 */}
      {isCorporate ? (
        <div
          className="relative px-8 py-6 text-white"
          style={{
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/70">
                Invoice
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {sellerName}
              </p>
            </div>
            <div className="text-right">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt="Logo"
                  className="mb-2 ml-auto h-9 w-auto object-contain"
                />
              ) : null}
              <p className="text-xs uppercase tracking-wider text-white/70">
                # {invoiceNumber}
              </p>
            </div>
          </div>
          <div
            className="mt-4 h-px w-full"
            style={{ backgroundColor: hexToRgba("#ffffff", 0.18) }}
          />
        </div>
      ) : null}

      <div className={cn("px-8 py-7", isCorporate ? "pt-5" : "pt-9")}>
        {/* 顶部标题区（非 Corporate） */}
        {!isCorporate ? (
          <div className="flex items-start justify-between gap-6 border-b border-slate-100 pb-6">
            <div>
              <p
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.36em]",
                  isMinimal ? "text-slate-700" : "text-slate-500"
                )}
              >
                Invoice
              </p>
              <h3 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                # {invoiceNumber}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {sellerName}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt="Logo"
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-base font-semibold"
                  style={{
                    backgroundColor: accentSoft,
                    color: accent,
                  }}
                >
                  {sellerName.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                style={{
                  backgroundColor: accentSoft,
                  color: accent,
                }}
              >
                {paperSize === "LETTER" ? "Letter" : "A4"}
              </span>
            </div>
          </div>
        ) : null}

        {/* From / Bill To */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 text-sm">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400"
            >
              From
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {sellerName}
            </p>
            {seller.email ? (
              <p className="mt-0.5 text-slate-600">{seller.email}</p>
            ) : null}
            {seller.phone ? (
              <p className="text-slate-600">{seller.phone}</p>
            ) : null}
            {seller.taxId ? (
              <p className="text-slate-600">Tax ID: {seller.taxId}</p>
            ) : null}
            {sellerLines.map((line) => (
              <p key={line} className="text-slate-600">
                {line}
              </p>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Bill To
            </p>
            {client ? (
              <>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {client.companyName}
                </p>
                {client.contactName ? (
                  <p className="mt-0.5 text-slate-600">{client.contactName}</p>
                ) : null}
                {client.email ? (
                  <p className="text-slate-600">{client.email}</p>
                ) : null}
                {client.address ? (
                  <p className="text-slate-600">{client.address}</p>
                ) : null}
                <p className="text-slate-600">
                  {getCountryName(client.country)}
                </p>
                {client.vatNumber ? (
                  <p className="text-slate-600">VAT: {client.vatNumber}</p>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-slate-400">Select a client</p>
            )}
          </div>
        </div>

        {/* 日期信息卡 */}
        <div
          className="mt-6 grid grid-cols-3 gap-2 rounded-xl border px-4 py-3 text-xs"
          style={{
            borderColor: isMinimal ? "#e2e8f0" : accentRing,
            backgroundColor: isMinimal ? "#f8fafc" : accentSoft,
          }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Invoice Date
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatDate(invoiceDate)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Due Date
            </p>
            <p
              className="mt-1 text-sm font-semibold"
              style={{ color: isMinimal ? "#0F172A" : accent }}
            >
              {formatDate(dueDate)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Terms
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {paymentTerms || "—"}
            </p>
          </div>
        </div>

        {/* 行项目表 */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr
                className="text-left"
                style={{
                  backgroundColor: isMinimal ? "#0F172A" : accent,
                  color: "#fff",
                }}
              >
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Add line items
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={index}
                    className={cn(
                      "border-b border-slate-50 last:border-b-0",
                      index % 2 === 1 && "bg-slate-50/40"
                    )}
                  >
                    <td className="px-4 py-3 text-slate-800">
                      {item.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatMoney(item.unitPrice, currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatMoney(
                        item.quantity * item.unitPrice,
                        currency
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 合计区 */}
        <div className="mt-6 flex justify-end">
          <div
            className="w-full max-w-xs space-y-2 rounded-xl border px-4 py-4 text-sm"
            style={{
              borderColor: isMinimal ? "#e2e8f0" : accentRing,
              backgroundColor: isMinimal ? "#ffffff" : accentSoft,
            }}
          >
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatMoney(totals.subtotal, currency)}</span>
            </div>
            {taxRatePercent > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span>Tax ({taxRatePercent}%)</span>
                <span>{formatMoney(totals.taxAmount, currency)}</span>
              </div>
            ) : null}
            <div
              className="flex items-baseline justify-between border-t pt-2"
              style={{ borderColor: isMinimal ? "#e2e8f0" : accentRing }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Total Due
              </span>
              <span
                className="text-xl font-bold tracking-tight"
                style={{ color: isMinimal ? "#0F172A" : accent }}
              >
                {formatMoney(totals.totalAmount, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes ? (
          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{notes}</p>
          </div>
        ) : null}

        {/* 页脚签名 */}
        {footerSignature ? (
          <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs italic text-slate-500">
            {footerSignature}
          </p>
        ) : null}

        {/* 通用底部装饰：Thank you */}
        {!footerSignature ? (
          <div className="mt-8 flex items-center gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
            <span
              className="inline-block h-1 w-6 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <span className="uppercase tracking-[0.24em]">
              Thank you for your business
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
