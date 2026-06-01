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
      return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
    }

    await requestPasswordReset(parsed.data.email);

    return ok({
      message:
        "If this email is registered with password login, you will receive a reset email. Please check your inbox and spam folder.",
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return fail("Failed to send. Please try again later.", 500);
  }
}
