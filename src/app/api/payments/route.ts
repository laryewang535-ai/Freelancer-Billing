import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { listPayments } from "@/lib/services/payment.service";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** 收款记录列表 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return fail("Invalid parameters", 400);

  const result = await listPayments(user.id, parsed.data);
  return ok(result.items, { meta: result.meta });
}
