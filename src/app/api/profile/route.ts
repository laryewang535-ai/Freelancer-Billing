import { NextRequest } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/db";
import { profileUpdateSchema, normalizeUrlField } from "@/lib/validators/profile";
import { ok, fail } from "@/lib/api/response";

function emptyToNull(value: string | null | undefined) {
  if (value === "" || value === undefined) return null;
  return value;
}

/** 获取当前用户资料 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      companyName: true,
      website: true,
      phone: true,
      taxId: true,
      logoUrl: true,
      address: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      locale: true,
      timezone: true,
      subscription: {
        select: { plan: true, status: true },
      },
    },
  });

  if (!user) {
    return fail("User not found", 404);
  }

  return ok(user);
}

/** 更新当前用户资料 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  try {
    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
    }

    const data = parsed.data;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        companyName: emptyToNull(data.companyName),
        website: normalizeUrlField(data.website),
        phone: emptyToNull(data.phone),
        taxId: emptyToNull(data.taxId),
        logoUrl: normalizeUrlField(data.logoUrl),
        address: emptyToNull(data.address),
        city: emptyToNull(data.city),
        state: emptyToNull(data.state),
        postalCode: emptyToNull(data.postalCode),
        country: emptyToNull(data.country),
        locale: data.locale,
        timezone: data.timezone,
      },
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        website: true,
        phone: true,
        taxId: true,
        logoUrl: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        locale: true,
        timezone: true,
      },
    });

    return ok(user);
  } catch (error) {
    console.error("[profile PATCH]", error);
    return fail("Update failed", 500);
  }
}
