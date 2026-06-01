import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { getRevenueTrend } from "@/lib/services/analytics.service";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const months = Number(request.nextUrl.searchParams.get("months") ?? 6);
  const data = await getRevenueTrend(user.id, months);
  return ok(data);
}
