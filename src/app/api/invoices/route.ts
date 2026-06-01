import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import {
  createInvoiceSchema,
  invoiceListQuerySchema,
} from "@/lib/validators/invoice";
import { createInvoice, listInvoices, peekNextInvoiceNumber } from "@/lib/services/invoice.service";

/** 获取 Invoice 列表 / 预览下一个编号 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  if (request.nextUrl.searchParams.get("peekNumber") === "1") {
    const number = await peekNextInvoiceNumber(user.id);
    return ok({ invoiceNumber: number });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = invoiceListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
  }

  const result = await listInvoices(user.id, parsed.data);
  return ok(result.items, { meta: result.meta });
}

/** 创建 Invoice */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
    }

    const invoice = await createInvoice(user.id, parsed.data);
    return ok(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CLIENT_NOT_FOUND") {
        return fail("Client not found", 404, "CLIENT_NOT_FOUND");
      }
      if (error.message === "INVOICE_LIMIT_REACHED") {
        return fail("Free plan is limited to 10 invoices per month. Please upgrade to Pro.", 403, "INVOICE_LIMIT_REACHED");
      }
      if (error.message === "TEMPLATE_REQUIRES_PRO") {
        return fail("This template requires Pro. Upgrade in Settings.", 403, "TEMPLATE_REQUIRES_PRO");
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return fail("Invoice number conflict. Please try again.", 409, "INVOICE_NUMBER_CONFLICT");
      }
    }
    console.error("[invoices POST]", error);
    return fail("Failed to create invoice", 500);
  }
}
