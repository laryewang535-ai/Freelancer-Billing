import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { getClientsRanking } from "@/lib/services/analytics.service";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 10);
  const data = await getClientsRanking(user.id, limit);
  return ok(data);
}
