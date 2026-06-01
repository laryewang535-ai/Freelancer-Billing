import type { ReminderRuleType } from "@prisma/client";
import { formatDate, formatMoney } from "@/lib/utils/format";

type Locale = "en";

function normalizeLocale(locale: string | null | undefined): Locale {
  return "en";
}

type Tone = "gentle" | "neutral" | "firm" | "urgent";

const TONE_BY_TYPE: Record<ReminderRuleType, Tone> = {
  BEFORE_7_DAYS: "gentle",
  BEFORE_3_DAYS: "gentle",
  ON_DUE_DATE: "neutral",
  OVERDUE_7_DAYS: "firm",
  OVERDUE_14_DAYS: "urgent",
};

const ACCENT_BY_TONE: Record<Tone, { primary: string; bgSoft: string; badge: string }> = {
  gentle: { primary: "#2563EB", bgSoft: "#EFF6FF", badge: "#2563EB" },
  neutral: { primary: "#0F766E", bgSoft: "#ECFDF5", badge: "#0F766E" },
  firm: { primary: "#D97706", bgSoft: "#FFFBEB", badge: "#B45309" },
  urgent: { primary: "#DC2626", bgSoft: "#FEF2F2", badge: "#B91C1C" },
};

type Copy = {
  subject: string;
  badge: string;
  heading: string;
  intro: string;
  amountLabel: string;
  dueLabel: string;
  callToAction: string;
  buttonLabel: string;
  closing: string;
  footer: string;
  pdfNote: string;
};

const COPY: Record<Locale, Record<ReminderRuleType, Copy>> = {
  en: {
    BEFORE_7_DAYS: {
      subject: "Friendly reminder: Invoice {invoice} due in 7 days",
      badge: "Upcoming",
      heading: "Your invoice will be due soon",
      intro: "Hi {client}, just a quick heads up that the invoice below is coming due in 7 days.",
      amountLabel: "Amount due",
      dueLabel: "Due date",
      callToAction: "Please review the invoice at your convenience.",
      buttonLabel: "View invoice",
      closing: "Thank you for your business.",
      footer: "Sent via Freelancer Billing on behalf of {seller}.",
      pdfNote: "The original invoice was sent in an earlier email.",
    },
    BEFORE_3_DAYS: {
      subject: "Reminder: Invoice {invoice} due in 3 days",
      badge: "Due soon",
      heading: "Invoice {invoice} is due in 3 days",
      intro: "Hi {client}, this is a friendly reminder that your invoice is due in 3 days.",
      amountLabel: "Amount due",
      dueLabel: "Due date",
      callToAction: "Let me know if there's anything you need to process the payment.",
      buttonLabel: "View invoice",
      closing: "Thank you in advance.",
      footer: "Sent via Freelancer Billing on behalf of {seller}.",
      pdfNote: "The original invoice was sent in an earlier email.",
    },
    ON_DUE_DATE: {
      subject: "Invoice {invoice} is due today",
      badge: "Due today",
      heading: "Invoice {invoice} is due today",
      intro: "Hi {client}, your invoice is due today. If payment has already been sent, please disregard this message.",
      amountLabel: "Amount due",
      dueLabel: "Due date",
      callToAction: "Please process the payment at your earliest convenience.",
      buttonLabel: "Pay invoice",
      closing: "Thank you.",
      footer: "Sent via Freelancer Billing on behalf of {seller}.",
      pdfNote: "The original invoice was sent in an earlier email.",
    },
    OVERDUE_7_DAYS: {
      subject: "Overdue: Invoice {invoice} — 7 days past due",
      badge: "7 days overdue",
      heading: "Invoice {invoice} is now overdue",
      intro: "Hi {client}, our records show that invoice {invoice} is 7 days past due. Please let me know if there is any issue I can help resolve.",
      amountLabel: "Amount due",
      dueLabel: "Original due date",
      callToAction: "Kindly arrange the payment as soon as possible.",
      buttonLabel: "Pay invoice",
      closing: "I appreciate your prompt attention to this matter.",
      footer: "Sent via Freelancer Billing on behalf of {seller}.",
      pdfNote: "The original invoice was sent in an earlier email.",
    },
    OVERDUE_14_DAYS: {
      subject: "URGENT: Invoice {invoice} — 14 days past due",
      badge: "14 days overdue",
      heading: "Final reminder for invoice {invoice}",
      intro: "Hi {client}, invoice {invoice} is now 14 days past due. If there is any issue with the invoice, please reach out so we can resolve it.",
      amountLabel: "Amount due",
      dueLabel: "Original due date",
      callToAction: "Please settle the outstanding balance to avoid further action.",
      buttonLabel: "Pay invoice now",
      closing: "Your prompt response would be greatly appreciated.",
      footer: "Sent via Freelancer Billing on behalf of {seller}.",
      pdfNote: "The original invoice was sent in an earlier email.",
    },
  },
};

export type BuildReminderEmailParams = {
  type: ReminderRuleType;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  dueDate: Date | string;
  clientName: string;
  sellerName: string;
  invoiceUrl?: string | null;
  locale?: string | null;
};

export type BuiltReminderEmail = {
  subject: string;
  html: string;
  text: string;
};

export function buildReminderEmail(params: BuildReminderEmailParams): BuiltReminderEmail {
  const locale = normalizeLocale(params.locale);
  const copy = COPY[locale][params.type];
  const tone = TONE_BY_TYPE[params.type];
  const accent = ACCENT_BY_TONE[tone];

  const formattedAmount = formatMoney(params.totalAmount, params.currency);
  const formattedDue = formatDate(params.dueDate);

  const ctx = {
    invoice: params.invoiceNumber,
    client: params.clientName,
    seller: params.sellerName,
  };

  const subject = render(copy.subject, ctx);
  const heading = render(copy.heading, ctx);
  const intro = render(copy.intro, ctx);
  const footer = render(copy.footer, ctx);

  const button = params.invoiceUrl
    ? `
      <div style="margin:24px 0">
        <a href="${escapeAttr(params.invoiceUrl)}"
           style="display:inline-block;background:${accent.primary};color:#fff;text-decoration:none;
                  padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px">
          ${escapeHtml(copy.buttonLabel)}
        </a>
      </div>`
    : "";

  const html = `
    <div style="font-family:Inter,-apple-system,Segoe UI,Arial,sans-serif;max-width:600px;
                margin:0 auto;color:#0f172a;padding:24px 16px">
      <div style="display:inline-block;background:${accent.bgSoft};color:${accent.badge};
                  font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
                  padding:4px 10px;border-radius:999px;margin-bottom:14px">
        ${escapeHtml(copy.badge)}
      </div>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a">
        ${escapeHtml(heading)}
      </h1>
      <p style="margin:0 0 18px;color:#475569;line-height:1.6;font-size:15px">
        ${escapeHtml(intro)}
      </p>

      <table role="presentation" style="width:100%;border-collapse:collapse;
              background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 18px">
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #f1f5f9">
            <div style="font-size:12px;color:#64748b;letter-spacing:.04em;text-transform:uppercase">
              ${escapeHtml(copy.amountLabel)}
            </div>
            <div style="font-size:24px;font-weight:700;color:${accent.primary};margin-top:4px">
              ${escapeHtml(formattedAmount)}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px">
            <div style="font-size:12px;color:#64748b;letter-spacing:.04em;text-transform:uppercase">
              ${escapeHtml(copy.dueLabel)}
            </div>
            <div style="font-size:15px;font-weight:600;color:#0f172a;margin-top:4px">
              ${escapeHtml(formattedDue)}
              <span style="color:#64748b;font-weight:400">
                · ${escapeHtml(params.invoiceNumber)}
              </span>
            </div>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 4px;color:#334155;line-height:1.6;font-size:14px">
        ${escapeHtml(copy.callToAction)}
      </p>
      ${button}
      <p style="margin:24px 0 0;color:#334155;line-height:1.6;font-size:14px">
        ${escapeHtml(copy.closing)}
      </p>
      <p style="margin:4px 0 0;color:#0f172a;line-height:1.6;font-size:14px;font-weight:600">
        ${escapeHtml(params.sellerName)}
      </p>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" />
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6">
        ${escapeHtml(copy.pdfNote)}<br/>
        ${escapeHtml(footer)}
      </p>
    </div>
  `;

  // 纯文本兜底，避免某些邮箱Client端只渲染 text
  const text =
    `${heading}\n\n` +
    `${intro}\n\n` +
    `${copy.amountLabel}: ${formattedAmount}\n` +
    `${copy.dueLabel}: ${formattedDue}\n` +
    `Invoice: ${params.invoiceNumber}\n\n` +
    `${copy.callToAction}\n` +
    (params.invoiceUrl ? `${copy.buttonLabel}: ${params.invoiceUrl}\n\n` : `\n`) +
    `${copy.closing}\n${params.sellerName}\n\n` +
    `--\n${footer}`;

  return { subject, html, text };
}

function render(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? "");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}
