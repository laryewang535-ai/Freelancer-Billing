import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import type { EmailJobStatus } from "@prisma/client";

export const runtime = "nodejs";

// Resend 现在用 Svix 签名（headers: svix-id / svix-timestamp / svix-signature）
// 校验算法见 https://docs.svix.com/receiving/verifying-payloads/how-manual
const TIMESTAMP_TOLERANCE_SEC = 5 * 60; // 5 分钟内有效，超时认为重放

type ResendWebhookEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    bounce?: { message?: string };
    [key: string]: unknown;
  };
};

/** Resend Webhook：同步 email_jobs 的投递/打开/退信状态 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Resend webhook not configured", { status: 503 });
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  if (!verifySvixSignature({ id: svixId, timestamp: svixTimestamp, signature: svixSignature, body: rawBody, secret })) {
    console.error("[resend webhook] invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawBody) as ResendWebhookEvent;
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  try {
    await handleResendEvent(event);
  } catch (error) {
    console.error("[resend webhook] handler error:", error);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** 校验 Svix 签名 + timestamp 防重放 */
function verifySvixSignature(params: {
  id: string;
  timestamp: string;
  signature: string;
  body: string;
  secret: string;
}): boolean {
  // 防重放：timestamp 与当前时间差不能超过容忍区间
  const ts = Number(params.timestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > TIMESTAMP_TOLERANCE_SEC) return false;

  // secret 形如 whsec_xxxxx，xxxxx 是 base64
  const secretBase = params.secret.replace(/^whsec_/, "");
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secretBase, "base64");
  } catch {
    return false;
  }

  const signedContent = `${params.id}.${params.timestamp}.${params.body}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  // svix-signature 可能包含多个版本：v1,base64 v1,base64
  const provided = params.signature
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3));

  return provided.some((sig) => safeEqual(expected, sig));
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** 将 Resend 事件映射到 email_jobs 字段 */
async function handleResendEvent(event: ResendWebhookEvent) {
  const emailId = event.data?.email_id;
  if (!emailId) return;

  const job = await prisma.emailJob.findUnique({ where: { resendId: emailId } });
  if (!job) {
    // 可能 webhook 比本地写入快，或不是我们发的邮件，静默忽略
    return;
  }

  const nowFromEvent = event.created_at ? new Date(event.created_at) : new Date();
  const updates: Record<string, unknown> = {};

  switch (event.type) {
    case "email.sent":
      // 已发出但收件方还未接收；通常 emailJob.status 在本地写入时已是 SENT
      if (job.status === "PENDING") updates.status = "SENT" satisfies EmailJobStatus;
      break;

    case "email.delivered":
      updates.status = "DELIVERED" satisfies EmailJobStatus;
      updates.deliveredAt = nowFromEvent;
      break;

    case "email.opened":
      // 打开是 delivered 之后的事件，避免回退状态
      if (job.status !== "FAILED" && job.status !== "BOUNCED") {
        updates.status = "OPENED" satisfies EmailJobStatus;
        if (!job.openedAt) updates.openedAt = nowFromEvent;
      }
      break;

    case "email.bounced":
    case "email.complained":
      updates.status = "BOUNCED" satisfies EmailJobStatus;
      updates.failedAt = nowFromEvent;
      updates.errorMessage =
        event.data?.bounce?.message ??
        (event.type === "email.complained" ? "Recipient marked as spam" : "Bounced");
      break;

    case "email.failed":
    case "email.delivery_delayed":
      updates.status = "FAILED" satisfies EmailJobStatus;
      updates.failedAt = nowFromEvent;
      updates.errorMessage = `Resend reported ${event.type}`;
      break;

    default:
      // email.clicked / 未知事件：暂不记录
      return;
  }

  if (Object.keys(updates).length === 0) return;

  await prisma.emailJob.update({
    where: { id: job.id },
    data: updates,
  });
}
