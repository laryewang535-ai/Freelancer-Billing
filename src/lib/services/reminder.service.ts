import { prisma } from "@/lib/db";
import { getUserPlan } from "@/lib/billing/plan-limits";
import { assertFeature } from "@/lib/billing/features";
import { sendReminderEmail } from "@/lib/services/email.service";
import { getPlanFeatures } from "@/lib/billing/features";
import { buildReminderEmail } from "@/lib/email/reminder-message";

import type { ReminderRuleType } from "@prisma/client";

// 每档相对到期日的天数偏移，负数代表"提前 X 天"
const RULE_OFFSETS: Record<ReminderRuleType, number> = {
  BEFORE_7_DAYS: -7,
  BEFORE_3_DAYS: -3,
  ON_DUE_DATE: 0,
  OVERDUE_7_DAYS: 7,
  OVERDUE_14_DAYS: 14,
};

// 排程到 UTC 09:00（与 vercel.json cron schedule "0 9 * * *" 对齐，
// 这样新发送的 Invoice 也会被当天/次日的 cron 抓到）
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(9, 0, 0, 0);
  return d;
}

function decimalToNumber(value: { toString(): string } | null | undefined): number {
  if (value == null) return 0;
  return Number(value.toString());
}

/** 构造可公开访问的 Invoice 详情链接（用于邮件按钮跳转） */
function buildInvoiceUrl(invoiceId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/invoices/${invoiceId}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 获取用户催款规则 */
export async function getReminderRules(userId: string) {
  const rules = await prisma.reminderRule.findMany({
    where: { userId },
    orderBy: { type: "asc" },
  });

  if (rules.length === 0) {
    const defaults = Object.keys(RULE_OFFSETS) as ReminderRuleType[];
    await prisma.reminderRule.createMany({
      data: defaults.map((type) => ({ userId, type, enabled: false })),
      skipDuplicates: true,
    });
    return prisma.reminderRule.findMany({ where: { userId } });
  }

  return rules;
}

/** 更新催款规则（Pro+） */
export async function updateReminderRules(
  userId: string,
  updates: Array<{ type: ReminderRuleType; enabled: boolean }>
) {
  const plan = await getUserPlan(userId);
  assertFeature(plan, "autoReminders");

  await Promise.all(
    updates.map((u) =>
      prisma.reminderRule.upsert({
        where: { userId_type: { userId, type: u.type } },
        update: { enabled: u.enabled },
        create: { userId, type: u.type, enabled: u.enabled },
      })
    )
  );

  return getReminderRules(userId);
}

/** 为 Invoice 预生成催款计划（发送后调用）
 *
 * 仅排程时间和占位 subject/body；真正的邮件内容会在 cron 实际发送时
 * 用最新 invoice / user 数据再构建一次（这样后续修改金额/到期日不会发出陈旧信息）。
 */
export async function scheduleRemindersForInvoice(userId: string, invoiceId: string) {
  const plan = await getUserPlan(userId);
  if (!getPlanFeatures(plan).autoReminders) return;

  const [invoice, rules] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: invoiceId, userId, deletedAt: null },
      include: {
        client: true,
        user: { select: { companyName: true, name: true, locale: true } },
      },
    }),
    prisma.reminderRule.findMany({ where: { userId, enabled: true } }),
  ]);

  if (!invoice || invoice.status === "PAID" || invoice.status === "CANCELLED") return;

  const sellerName = invoice.user.companyName || invoice.user.name || "Freelancer";

  for (const rule of rules) {
    const offset = RULE_OFFSETS[rule.type];
    const scheduledAt = addDays(invoice.dueDate, offset);

    // 预生成一次邮件文案，仅用于后台列表/邮件历史预览；实际发送时会重新构建
    const preview = buildReminderEmail({
      type: rule.type,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: decimalToNumber(invoice.totalAmount),
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      clientName: invoice.client.contactName,
      sellerName,
      invoiceUrl: buildInvoiceUrl(invoice.id),
      locale: invoice.user.locale,
    });

    await prisma.reminder.upsert({
      where: { invoiceId_type: { invoiceId, type: rule.type } },
      update: {
        scheduledAt,
        subject: preview.subject,
        body: preview.html,
        status: "SCHEDULED",
        errorMessage: null,
      },
      create: {
        invoiceId,
        type: rule.type,
        scheduledAt,
        subject: preview.subject,
        body: preview.html,
        status: "SCHEDULED",
      },
    });
  }
}

/** Cron：处理到期催款（每天 09:00 UTC 触发，参见 vercel.json） */
export async function processDueReminders() {
  const now = new Date();
  const dueReminders = await prisma.reminder.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      invoice: {
        deletedAt: null,
        status: { in: ["SENT", "VIEWED", "OVERDUE"] },
      },
    },
    select: { id: true, type: true, invoiceId: true, invoice: { select: { userId: true } } },
    take: 50,
  });

  let processed = 0;

  for (const reminder of dueReminders) {
    try {
      await sendReminderEmail(
        reminder.invoice.userId,
        reminder.invoiceId,
        reminder.id,
        reminder.type
      );
      processed++;
    } catch (e) {
      console.error("[reminder]", reminder.id, e);
    }
  }

  return { processed, total: dueReminders.length };
}

/** Cron：标记逾期 Invoice */
export async function markOverdueInvoices() {
  const today = startOfDay(new Date());

  const overdue = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      status: { in: ["SENT", "VIEWED"] },
      dueDate: { lt: today },
    },
    select: { id: true, userId: true, invoiceNumber: true },
  });

  for (const inv of overdue) {
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status: "OVERDUE",
        overdueAt: new Date(),
        activities: {
          create: {
            userId: inv.userId,
            type: "OVERDUE",
            message: `Invoice ${inv.invoiceNumber} is overdue`,
          },
        },
      },
    });
  }

  return { count: overdue.length };
}
