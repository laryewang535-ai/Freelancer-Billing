import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { createPortalSession } from "@/lib/services/billing.service";

/** 跳转 Lemon Squeezy 客户订阅管理页 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const session = await createPortalSession(user.id);
    return ok(session);
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, [string, number, string]> = {
        LEMONSQUEEZY_NOT_CONFIGURED: ["Lemon Squeezy is not configured", 503, "LEMONSQUEEZY_NOT_CONFIGURED"],
        NO_LEMONSQUEEZY_SUBSCRIPTION: [
          "No active subscription yet. Please upgrade first.",
          400,
          "NO_LEMONSQUEEZY_SUBSCRIPTION",
        ],
        PORTAL_URL_UNAVAILABLE: ["Unable to get the billing portal link", 503, "PORTAL_URL_UNAVAILABLE"],
      };
      const mapped = map[error.message];
      if (mapped) return fail(mapped[0], mapped[1], mapped[2]);
    }
    console.error("[billing portal]", error);
    return fail("Failed to open billing portal", 500);
  }
}
