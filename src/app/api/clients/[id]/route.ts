import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import {
  updateClientSchema,
  normalizeClientInput,
} from "@/lib/validators/client";
import {
  deleteClient,
  getClientById,
  getClientDetail,
  updateClient,
} from "@/lib/services/client.service";

type RouteContext = { params: Promise<{ id: string }> };

/** 获取客户详情 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await context.params;
  const searchParams = _request.nextUrl.searchParams;
  const detailed = searchParams.get("detailed") === "1";

  if (detailed) {
    const detail = await getClientDetail(user.id, id);
    if (!detail) return fail("Client not found", 404, "NOT_FOUND");
    return ok(detail);
  }

  const client = await getClientById(user.id, id);
  if (!client) return fail("Client not found", 404, "NOT_FOUND");
  return ok(client);
}

/** 更新客户 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
    }

    const client = await updateClient(
      user.id,
      id,
      normalizeClientInput(parsed.data)
    );
    if (!client) return fail("Client not found", 404, "NOT_FOUND");
    return ok(client);
  } catch (error) {
    console.error("[clients PATCH]", error);
    return fail("Update failed", 500);
  }
}

/** 删除客户（软删除） */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await context.params;

  try {
    const client = await deleteClient(user.id, id);
    if (!client) return fail("Client not found", 404, "NOT_FOUND");
    return ok({ id: client.id });
  } catch (error) {
    if (error instanceof Error && error.message === "CLIENT_HAS_INVOICES") {
      return fail("This client has linked invoices and cannot be deleted", 409, "CLIENT_HAS_INVOICES");
    }
    console.error("[clients DELETE]", error);
    return fail("Failed to delete", 500);
  }
}
