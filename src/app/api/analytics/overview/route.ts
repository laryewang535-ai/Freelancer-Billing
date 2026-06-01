import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { getAnalyticsOverview } from "@/lib/services/analytics.service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const data = await getAnalyticsOverview(user.id);
  return ok(data);
}
