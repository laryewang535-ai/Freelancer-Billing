import { NextRequest } from "next/server";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { ok, fail } from "@/lib/api/response";

/** 申请密码重置邮件（不暴露邮箱是否已注册） */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "参数无效", 400);
    }

    await requestPasswordReset(parsed.data.email);

    return ok({
      message:
        "若该邮箱已注册且使用密码登录，您将收到重置邮件，请查收（含垃圾邮件文件夹）。",
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return fail("发送失败，请稍后重试", 500);
  }
}
