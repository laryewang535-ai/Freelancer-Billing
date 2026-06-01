import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import {
  createClientSchema,
  clientListQuerySchema,
  normalizeClientInput,
} from "@/lib/validators/client";
import { createClient, listClients } from "@/lib/services/client.service";

/** 获取客户列表 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = clientListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
  }

  const result = await listClients(user.id, parsed.data);
  return ok(result.items, { meta: result.meta });
}

/** 创建客户 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
    }

    const client = await createClient(user.id, normalizeClientInput(parsed.data));
    return ok(client, { status: 201 });
  } catch (error) {
    console.error("[clients POST]", error);
    return fail("Failed to create client", 500);
  }
}
