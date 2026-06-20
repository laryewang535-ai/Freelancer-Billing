import { getAdminUser } from "@/lib/auth/admin";
import { fail, ok } from "@/lib/api/response";
import { ensureExternalOrderSchema } from "@/lib/services/external-order-schema.service";

export async function POST() {
  const admin = await getAdminUser();
  if (!admin) return fail("Forbidden", 403, "ADMIN_REQUIRED");

  try {
    await ensureExternalOrderSchema();
    return ok({ initialized: true });
  } catch (error) {
    console.error("[admin external-orders setup]", error);
    return fail("Could not initialize order tables", 500);
  }
}
