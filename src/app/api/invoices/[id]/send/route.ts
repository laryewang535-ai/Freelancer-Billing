import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { sendInvoiceEmail } from "@/lib/services/email.service";
import { scheduleRemindersForInvoice } from "@/lib/services/reminder.service";
import { sendInvoiceActionSchema } from "@/lib/validators/email";

type RouteContext = { params: Promise<{ id: string }> };

/** 发送 Invoice 邮件 */
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = sendInvoiceActionSchema.safeParse({ ...body, action: "send" });
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
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, [string, number, string]> = {
        INVOICE_NOT_SENDABLE: ["This invoice cannot be sent in its current status", 409, "INVOICE_NOT_SENDABLE"],
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
    console.error("[send invoice]", error);
    return fail("Failed to send", 500);
  }
}
