export function buildPasswordResetEmailHtml(params: {
  name: string | null;
  resetUrl: string;
  expiresMinutes: number;
}) {
  const greeting = params.name ? `Hi ${escapeHtml(params.name)},` : "Hi,";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:24px;">
  <p>${greeting}</p>
  <p>We received a request to reset your Freelancer Billing password. Click the button below to set a new password:</p>
  <p style="margin:28px 0;">
    <a href="${escapeHtml(params.resetUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Reset password</a>
  </p>
  <p style="font-size:14px;color:#64748b;">This link expires in ${params.expiresMinutes} minutes. If you did not request this, you can ignore this email.</p>
  <p style="font-size:12px;color:#94a3b8;word-break:break-all;">If the button does not open, copy this link into your browser:<br />${escapeHtml(params.resetUrl)}</p>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
