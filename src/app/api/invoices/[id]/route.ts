import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { updateInvoiceSchema } from "@/lib/validators/invoice";
import {
  cancelInvoice,
  deleteInvoice,
  duplicateInvoice,
  getInvoiceById,
  sendInvoice,
  updateInvoice,
} from "@/lib/services/invoice.service";

type RouteContext = { params: Promise<{ id: string }> };

/** 获取 Invoice 详情 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await context.params;
  const invoice = await getInvoiceById(user.id, id);
  if (!invoice) return fail("Invoice not found", 404, "NOT_FOUND");
  return ok(invoice);
}

/** 更新 Invoice */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
    }

    const invoice = await updateInvoice(user.id, id, parsed.data);
    if (!invoice) return fail("Invoice not found", 404, "NOT_FOUND");
    return ok(invoice);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVOICE_NOT_EDITABLE") {
        return fail("Only draft invoices can be edited", 409, "INVOICE_NOT_EDITABLE");
      }
      if (error.message === "CLIENT_NOT_FOUND") {
        return fail("Client not found", 404, "CLIENT_NOT_FOUND");
      }
      if (error.message === "TEMPLATE_REQUIRES_PRO") {
        return fail("This template requires Pro. Upgrade in Settings.", 403, "TEMPLATE_REQUIRES_PRO");
      }
    }
    console.error("[invoices PATCH]", error);
    return fail("Update failed", 500);
  }
}

/** 删除 Invoice */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await context.params;

  try {
    const invoice = await deleteInvoice(user.id, id);
    if (!invoice) return fail("Invoice not found", 404, "NOT_FOUND");
    return ok({ id: invoice.id });
  } catch (error) {
    if (error instanceof Error && error.message === "INVOICE_NOT_DELETABLE") {
      return fail("Only draft or cancelled invoices can be deleted", 409, "INVOICE_NOT_DELETABLE");
    }
    console.error("[invoices DELETE]", error);
    return fail("Failed to delete", 500);
  }
}
