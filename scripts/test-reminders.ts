/**
 * 本地催款邮件冒烟测试
 *
 * 做什么：
 *   1. 找到指定用户，临时升级为 PRO（如果还是 FREE）
 *   2. 启用全部 5 档催款规则
 *   3. 创建/复用一个测试客户（收件邮箱 = 你能收到的 Gmail）
 *   4. 创建一张已逾期 10 天的测试 Invoice (status=SENT)
 *   5. 调 scheduleRemindersForInvoice 排程 5 条 reminder
 *   6. 把每条 reminder 的 scheduledAt 拉到 1 分钟前
 *   7. 调 processDueReminders 立刻触发发送
 *   8. 打印每条 reminder + email_job 的结果
 *
 * 用法：
 *   npm run test:reminders
 *
 * 自定义：
 *   TEST_USER_EMAIL=demo@freelancer-billing.test \
 *   TEST_RECIPIENT_EMAIL=laryewang535@gmail.com \
 *     npm run test:reminders
 *
 * 注意：
 *   - 必须配好 .env.local 的 RESEND_API_KEY / RESEND_FROM_EMAIL
 *   - Resend 免费档 onboarding@resend.dev 只能发到你注册 Resend 时的邮箱
 *     （想发到任意客户邮箱需要先在 Resend 验证自己的域名）
 */
import fs from "node:fs";
import path from "node:path";

// 必须在导入 prisma / 任何模块前加载 .env.local（不依赖 dotenv）
loadEnvLocal();

import { prisma } from "@/lib/db";
import {
  scheduleRemindersForInvoice,
  processDueReminders,
} from "@/lib/services/reminder.service";
import { isEmailConfigured } from "@/lib/email/mail-client";
import type { ReminderRuleType } from "@prisma/client";

const TARGET_USER_EMAIL =
  process.env.TEST_USER_EMAIL || "demo@freelancer-billing.test";
const RECIPIENT_EMAIL =
  process.env.TEST_RECIPIENT_EMAIL || "laryewang535@gmail.com";

const ALL_TYPES: ReminderRuleType[] = [
  "BEFORE_7_DAYS",
  "BEFORE_3_DAYS",
  "ON_DUE_DATE",
  "OVERDUE_7_DAYS",
  "OVERDUE_14_DAYS",
];

async function main() {
  console.log("════════════════════════════════════════");
  console.log(" 催款邮件本地冒烟测试");
  console.log("════════════════════════════════════════");
  console.log(`收件人:    ${RECIPIENT_EMAIL}`);
  console.log(`测试用户:  ${TARGET_USER_EMAIL}`);
  console.log(`发件人:    ${process.env.RESEND_FROM_EMAIL ?? "(未配置)"}`);
  console.log();

  if (!isEmailConfigured()) {
    console.error(
      "❌ Resend 未配置。请确保 .env.local 里有 RESEND_API_KEY 和 RESEND_FROM_EMAIL。"
    );
    process.exit(1);
  }

  // ─── 1. 找用户 ───────────────────────────────
  const user = await prisma.user.findUnique({
    where: { email: TARGET_USER_EMAIL },
    include: { subscription: true },
  });
  if (!user) {
    console.error(`❌ 找不到用户 ${TARGET_USER_EMAIL}`);
    console.error(
      "   可以用 TEST_USER_EMAIL=xxx@xxx 指定别的本地用户邮箱"
    );
    process.exit(1);
  }
  console.log(
    `✅ 用户 id=${user.id}  plan=${user.subscription?.plan ?? "FREE"}`
  );

  // ─── 2. 确保是 PRO（否则 autoReminders feature 关闭）─────
  if (!user.subscription || user.subscription.plan === "FREE") {
    console.log("⚠️  当前 plan=FREE，临时升级为 PRO 以启用催款功能");
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { plan: "PRO", status: "ACTIVE" },
      create: { userId: user.id, plan: "PRO", status: "ACTIVE" },
    });
  }

  // ─── 3. 启用 5 档 reminder 规则 ─────────────────
  for (const type of ALL_TYPES) {
    await prisma.reminderRule.upsert({
      where: { userId_type: { userId: user.id, type } },
      update: { enabled: true },
      create: { userId: user.id, type, enabled: true },
    });
  }
  console.log("✅ 已启用全部 5 档催款规则");

  // ─── 4. 创建/复用测试客户 ───────────────────────
  let client = await prisma.client.findFirst({
    where: {
      userId: user.id,
      email: RECIPIENT_EMAIL,
      deletedAt: null,
    },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        userId: user.id,
        companyName: "Reminder Test Client",
        contactName: "Test Client",
        email: RECIPIENT_EMAIL,
        country: "CN",
      },
    });
    console.log(`✅ 已创建测试客户 ${client.id}`);
  } else {
    console.log(`✅ 复用已有测试客户 ${client.id}`);
  }

  // ─── 5. 软删之前的同类测试 Invoice ──────────────
  const prev = await prisma.invoice.updateMany({
    where: {
      userId: user.id,
      invoiceNumber: { startsWith: "REMINDER-TEST-" },
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });
  if (prev.count > 0) {
    console.log(`🧹 软删除 ${prev.count} 条历史测试 invoices`);
  }

  // ─── 6. 创建已逾期 10 天的测试 Invoice ──────────
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() - 10);
  dueDate.setHours(0, 0, 0, 0);

  const invoiceNumber = `REMINDER-TEST-${now.getTime()}`;
  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: client.id,
      invoiceNumber,
      status: "SENT",
      currency: "USD",
      subtotal: "1234.56",
      taxRate: "0",
      taxAmount: "0",
      totalAmount: "1234.56",
      invoiceDate: now,
      dueDate,
      paymentTerms: "Net 30",
      sentAt: now,
      items: {
        create: [
          {
            description: "Reminder email smoke test",
            quantity: "1",
            unitPrice: "1234.56",
            lineTotal: "1234.56",
          },
        ],
      },
    },
  });
  console.log(
    `✅ Invoice ${invoice.invoiceNumber} 创建，dueDate=${dueDate.toLocaleDateString()}（10 天前）`
  );

  // ─── 7. 排程 5 档催款 ───────────────────────────
  await scheduleRemindersForInvoice(user.id, invoice.id);
  const scheduledCount = await prisma.reminder.count({
    where: { invoiceId: invoice.id },
  });
  console.log(`✅ 已写入 ${scheduledCount} 条 reminders`);

  if (scheduledCount === 0) {
    console.error(
      "❌ scheduleRemindersForInvoice 没生成任何 reminder。检查 user.plan 是否真的是 PRO/BUSINESS。"
    );
    process.exit(1);
  }

  // ─── 8. 把 scheduledAt 拉到 1 分钟前 ───────────
  const past = new Date(Date.now() - 60 * 1000);
  const upd = await prisma.reminder.updateMany({
    where: { invoiceId: invoice.id, status: "SCHEDULED" },
    data: { scheduledAt: past },
  });
  console.log(`✅ ${upd.count} 条 reminder 的 scheduledAt 已拉到 1 分钟前`);

  // ─── 9. 触发 Cron 发送 ─────────────────────────
  console.log("\n📤 开始发送…");
  const result = await processDueReminders();
  console.log(`✅ 处理完成：${result.processed}/${result.total} 成功`);

  // ─── 10. 打印结果 ─────────────────────────────
  const reminders = await prisma.reminder.findMany({
    where: { invoiceId: invoice.id },
    orderBy: { type: "asc" },
    select: {
      type: true,
      status: true,
      sentAt: true,
      errorMessage: true,
      subject: true,
    },
  });
  console.log("\n📋 Reminders 结果:");
  console.table(
    reminders.map((r) => ({
      type: r.type,
      status: r.status,
      sent_at: r.sentAt?.toISOString().slice(11, 19) ?? "—",
      subject: (r.subject ?? "—").slice(0, 50),
      error: r.errorMessage ?? "",
    }))
  );

  const jobs = await prisma.emailJob.findMany({
    where: { invoiceId: invoice.id, type: "REMINDER" },
    orderBy: { createdAt: "asc" },
    select: {
      toEmail: true,
      subject: true,
      status: true,
      resendId: true,
      errorMessage: true,
    },
  });
  console.log("\n📋 EmailJobs 结果:");
  console.table(
    jobs.map((j) => ({
      to: j.toEmail,
      subject: j.subject.slice(0, 50),
      status: j.status,
      resend_id: j.resendId?.slice(0, 12) ?? "—",
      error: (j.errorMessage ?? "").slice(0, 60),
    }))
  );

  console.log("\n🎉 完成！");
  console.log(`📬 请去 ${RECIPIENT_EMAIL} 收件箱查看（含垃圾邮件箱）`);
  console.log(
    `🔍 Resend 后台投递日志：https://resend.com/emails`
  );
  console.log(
    "\n如果只发出 1-2 封而不是 5 封，多半是 Resend 限流（免费档 2 req/sec）。"
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\n❌ 测试失败：");
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

/** 简单解析 .env.local，把缺失的 key 写进 process.env */
function loadEnvLocal() {
  const envFile = path.resolve(import.meta.dirname, "..", ".env.local");
  if (!fs.existsSync(envFile)) return;
  const text = fs.readFileSync(envFile, "utf-8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
