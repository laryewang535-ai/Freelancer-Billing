import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { cancelInvoice, duplicateInvoice } from "@/lib/services/invoice.service";
import { sendInvoiceEmail } from "@/lib/services/email.service";
import { scheduleRemindersForInvoice } from "@/lib/services/reminder.service";
import { markInvoicePaid } from "@/lib/services/payment.service";
import { sendInvoiceActionSchema } from "@/lib/validators/email";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const markPaidSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  fee: z.coerce.number().min(0).optional(),
  paymentMethod: z
    .enum(["WISE", "STRIPE", "PAYPAL", "BANK_TRANSFER", "CRYPTO", "OTHER"])
    .optional(),
  notes: z.string().optional().nullable(),
});

/** Invoice 操作：send | cancel | duplicate | markPaid */
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await context.params;

  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "send") {
      const parsed = sendInvoiceActionSchema.safeParse(body);
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
      }
      const invoice = await sendInvoiceEmail(user.id, id, {
        clientId: parsed.data.clientId,
        message: parsed.data.message,
      });
      if (!invoice) return fail("Invoice not found", 404, "NOT_FOUND");
      await scheduleRemindersForInvoice(user.id, id).catch(console.error);
      return ok(invoice);
    }

    if (action === "markPaid") {
      const parsed = markPaidSchema.safeParse(body);
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
      }
      const result = await markInvoicePaid(user.id, id, parsed.data);
      if (!result) return fail("Invoice not found", 404, "NOT_FOUND");
      return ok(result);
    }

    if (action === "cancel") {
      const invoice = await cancelInvoice(user.id, id);
      if (!invoice) return fail("Invoice not found", 404, "NOT_FOUND");
      return ok(invoice);
    }

    if (action === "duplicate") {
      const invoice = await duplicateInvoice(user.id, id);
      if (!invoice) return fail("Invoice not found", 404, "NOT_FOUND");
      return ok(invoice, { status: 201 });
    }

    return fail("Unknown action", 400);
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, [string, number, string]> = {
        INVOICE_NOT_SENDABLE: ["This invoice cannot be sent in its current status", 409, "INVOICE_NOT_SENDABLE"],
        INVOICE_NOT_CANCELLABLE: ["This invoice cannot be cancelled in its current status", 409, "INVOICE_NOT_CANCELLABLE"],
        INVOICE_LIMIT_REACHED: ["Free plan is limited to 10 invoices per month", 403, "INVOICE_LIMIT_REACHED"],
        INVOICE_ALREADY_PAID: ["Invoice is already paid", 409, "INVOICE_ALREADY_PAID"],
        INVOICE_CANCELLED: ["Invoice is cancelled", 409, "INVOICE_CANCELLED"],
        EMAIL_NOT_CONFIGURED: [
          "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in .env.local.",
          503,
          "EMAIL_NOT_CONFIGURED",
        ],
        CLIENT_NOT_FOUND: ["Recipient client not found", 404, "CLIENT_NOT_FOUND"],
        PDF_GENERATION_FAILED: ["PDF generation failed", 500, "PDF_GENERATION_FAILED"],
      };
      const mapped = map[error.message];
      if (mapped) return fail(mapped[0], mapped[1], mapped[2]);
    }
    console.error("[invoices action POST]", error);
    return fail("Action failed", 500);
  }
}
