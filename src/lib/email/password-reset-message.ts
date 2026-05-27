/** 密码重置邮件 HTML */
export function buildPasswordResetEmailHtml(params: {
  name: string | null;
  resetUrl: string;
  expiresMinutes: number;
}) {
  const greeting = params.name ? `您好，${escapeHtml(params.name)}：` : "您好：";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:24px;">
  <p>${greeting}</p>
  <p>我们收到了重置 Freelancer Billing 账户密码的请求。请点击下方按钮设置新密码：</p>
  <p style="margin:28px 0;">
    <a href="${escapeHtml(params.resetUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">重置密码</a>
  </p>
  <p style="font-size:14px;color:#64748b;">链接将在 ${params.expiresMinutes} 分钟后失效。若您未申请重置，可忽略此邮件。</p>
  <p style="font-size:12px;color:#94a3b8;word-break:break-all;">若按钮无法打开，请复制链接到浏览器：<br />${escapeHtml(params.resetUrl)}</p>
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
