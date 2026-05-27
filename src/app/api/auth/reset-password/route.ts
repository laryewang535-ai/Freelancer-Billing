import { NextRequest } from "next/server";
import { completePasswordReset } from "@/lib/auth/password-reset";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { ok, fail } from "@/lib/api/response";

/** 使用邮件中的令牌设置新密码 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "参数无效", 400);
    }

    const result = await completePasswordReset(parsed.data.token, parsed.data.password);

    if (result === "INVALID_TOKEN") {
      return fail("链接无效或已过期，请重新申请重置密码", 400, "INVALID_TOKEN");
    }

    return ok({ message: "密码已更新，请使用新密码登录。" });
  } catch (error) {
    console.error("[reset-password]", error);
    return fail("重置失败，请稍后重试", 500);
  }
}
