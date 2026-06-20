import { z } from "zod";
import { getAdminUser } from "@/lib/auth/admin";
import { fail, ok } from "@/lib/api/response";
import {
  createExternalOrder,
  listExternalOrders,
} from "@/lib/services/external-order.service";

const createOrderSchema = z.object({
  userEmail: z.string().email().max(320),
  provider: z.enum(["GUMROAD", "PATREON", "BUY_ME_A_COFFEE", "OTHER"]),
  externalOrderId: z.string().trim().min(1).max(200),
  purchaserEmail: z.string().email().max(320).optional().or(z.literal("")),
  productName: z.string().trim().max(160).optional().or(z.literal("")),
  plan: z.enum(["PRO", "BUSINESS"]),
  periodMonths: z.coerce.number().int().min(1).max(24).default(1),
  amount: z.union([z.coerce.number().nonnegative(), z.literal("")]).optional(),
  currency: z.string().trim().length(3).optional().or(z.literal("")),
  purchasedAt: z.string().date().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return fail("Forbidden", 403, "ADMIN_REQUIRED");

  return ok(await listExternalOrders());
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return fail("Forbidden", 403, "ADMIN_REQUIRED");

  try {
    const parsed = createOrderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid order", 400);
    }

    const data = parsed.data;
    const order = await createExternalOrder({
      ...data,
      purchaserEmail: data.purchaserEmail || null,
      productName: data.productName || null,
      amount: data.amount === "" || data.amount === undefined ? null : data.amount,
      currency: data.currency || null,
      purchasedAt: data.purchasedAt ? new Date(`${data.purchasedAt}T00:00:00.000Z`) : null,
      notes: data.notes || null,
    });
    return ok(order, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return fail("No app account uses that email address", 404, "USER_NOT_FOUND");
    }
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return fail("This platform order ID is already recorded", 409, "DUPLICATE_ORDER");
    }
    console.error("[admin external-orders POST]", error);
    return fail("Could not create order", 500);
  }
}
