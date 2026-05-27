import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { isEmailConfigured, sendEmail, buildResendFrom } from "@/lib/email/mail-client";
import { buildPasswordResetEmailHtml } from "@/lib/email/password-reset-message";

const RESET_PREFIX = "password-reset:";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 小时

function resetIdentifier(email: string) {
  return `${RESET_PREFIX}${email.toLowerCase()}`;
}

function getAppUrl() {
  return (process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

/** 发起重置：有密码账号才发信；不暴露邮箱是否存在 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, passwordHash: true, name: true },
  });

  if (!user?.passwordHash) {
    return;
  }

  if (!isEmailConfigured()) {
    console.error("[password-reset] Resend 未配置，无法发送重置邮件");
    return;
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  const identifier = resetIdentifier(normalizedEmail);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const html = buildPasswordResetEmailHtml({
    name: user.name,
    resetUrl,
    expiresMinutes: 60,
  });

  await sendEmail({
    to: normalizedEmail,
    subject: "重置您的 Freelancer Billing 密码",
    html,
    from: buildResendFrom(),
  });
}

/** 使用令牌设置新密码 */
export async function completePasswordReset(
  token: string,
  newPassword: string
): Promise<"OK" | "INVALID_TOKEN"> {
  const trimmed = token.trim();
  if (!trimmed) return "INVALID_TOKEN";

  const record = await prisma.verificationToken.findFirst({
    where: {
      token: trimmed,
      identifier: { startsWith: RESET_PREFIX },
      expires: { gt: new Date() },
    },
  });

  if (!record) return "INVALID_TOKEN";

  const email = record.identifier.slice(RESET_PREFIX.length);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });
    return "INVALID_TOKEN";
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  return "OK";
}
