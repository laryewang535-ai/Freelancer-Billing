import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { getCountryDistribution } from "@/lib/services/analytics.service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const data = await getCountryDistribution(user.id);
  return ok(data);
}
