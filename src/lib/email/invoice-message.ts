import { formatDate, formatMoney } from "@/lib/utils/format";

export function buildDefaultInvoiceMessage(params: {
  contactName: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  dueDate: Date | string;
  sellerName: string;
}): string {
  const due = formatDate(params.dueDate);
  const amount = formatMoney(params.totalAmount, params.currency);

  return `Hi ${params.contactName},

Please find attached invoice ${params.invoiceNumber} for ${amount}, due ${due}.

Let me know if you have any questions.

Best,
${params.sellerName}`;
}

export function buildInvoiceEmailHtml(params: {
  invoiceNumber: string;
  clientName: string;
  sellerName: string;
  totalAmount: number;
  currency: string;
  dueDate: Date | string;
  message: string;
}): string {
  const due = formatDate(params.dueDate);
  const amount = formatMoney(params.totalAmount, params.currency);
  const bodyHtml = params.message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;line-height:1.6">${escapeHtml(line)}</p>`)
    .join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="color:#2563EB;margin:0 0 16px">Invoice ${escapeHtml(params.invoiceNumber)}</h2>
      <p style="color:#64748b;margin:0 0 20px">
        ${escapeHtml(params.sellerName)} · ${escapeHtml(amount)} · Due ${escapeHtml(due)}
      </p>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="color:#64748b;font-size:12px;margin:0">
        PDF invoice attached · Sent via Freelancer Billing Assistant
      </p>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
