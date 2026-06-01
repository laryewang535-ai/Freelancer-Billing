import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { getBillingStatus } from "@/lib/services/billing.service";

/** 获取当前订阅状态 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const status = await getBillingStatus(user.id);
  return ok(status);
}
