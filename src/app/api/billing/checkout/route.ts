import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { createCheckoutSession } from "@/lib/services/billing.service";
import { prisma } from "@/lib/db";

const schema = z.object({
  plan: z.enum(["PRO", "BUSINESS"]),
});

/** 创建 Lemon Squeezy Checkout 跳转链接 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Invalid parameters", 400);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, companyName: true },
    });

    const session = await createCheckoutSession(
      user.id,
      parsed.data.plan,
      dbUser?.email,
      dbUser?.companyName ?? dbUser?.name
    );
    return ok(session);
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, [string, number, string]> = {
        LEMONSQUEEZY_NOT_CONFIGURED: [
          "Lemon Squeezy is not configured. Set the API key, Store ID, and Variant IDs in .env.local.",
          503,
          "LEMONSQUEEZY_NOT_CONFIGURED",
        ],
        LEMONSQUEEZY_VARIANT_NOT_CONFIGURED: [
          "Lemon Squeezy Variant ID is not configured",
          503,
          "LEMONSQUEEZY_VARIANT_NOT_CONFIGURED",
        ],
      };
      const mapped = map[error.message];
      if (mapped) return fail(mapped[0], mapped[1], mapped[2]);
    }
    console.error("[billing checkout]", error);
    return fail("Failed to create checkout link", 500);
  }
}
