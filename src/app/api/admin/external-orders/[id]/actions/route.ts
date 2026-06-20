import { z } from "zod";
import { getAdminUser } from "@/lib/auth/admin";
import { fail, ok } from "@/lib/api/response";
import { processExternalOrder } from "@/lib/services/external-order.service";

const actionSchema = z.object({
  action: z.enum([
    "ACTIVATED",
    "RENEWED",
    "CANCEL_AT_PERIOD_END",
    "REFUNDED",
    "REVOKED",
  ]),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const admin = await getAdminUser();
  if (!admin?.email) return fail("Forbidden", 403, "ADMIN_REQUIRED");

  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid action", 400);
    }

    const { id } = await context.params;
    const order = await processExternalOrder({
      orderId: id,
      action: parsed.data.action,
      note: parsed.data.note || null,
      performedBy: admin.email,
    });
    return ok(order);
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return fail("Order not found", 404, "ORDER_NOT_FOUND");
    }
    console.error("[admin external-orders action]", error);
    return fail("Could not update order", 500);
  }
}
