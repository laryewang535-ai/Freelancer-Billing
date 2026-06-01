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
      return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
    }

    const result = await completePasswordReset(parsed.data.token, parsed.data.password);

    if (result === "INVALID_TOKEN") {
      return fail("The link is invalid or expired. Please request a new password reset.", 400, "INVALID_TOKEN");
    }

    return ok({ message: "Password updated. Please sign in with your new password." });
  } catch (error) {
    console.error("[reset-password]", error);
    return fail("Password reset failed. Please try again later.", 500);
  }
}
