import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { getReminderRules, updateReminderRules } from "@/lib/services/reminder.service";
import { z } from "zod";
import type { ReminderRuleType } from "@prisma/client";

const updateSchema = z.object({
  rules: z.array(
    z.object({
      type: z.enum([
        "BEFORE_7_DAYS",
        "BEFORE_3_DAYS",
        "ON_DUE_DATE",
        "OVERDUE_7_DAYS",
        "OVERDUE_14_DAYS",
      ]),
      enabled: z.boolean(),
    })
  ),
});

/** 获取催款规则 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  const rules = await getReminderRules(user.id);
  return ok(rules);
}

/** 更新催款规则 */
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid parameters", 400);

    const rules = await updateReminderRules(
      user.id,
      parsed.data.rules as Array<{ type: ReminderRuleType; enabled: boolean }>
    );
    return ok(rules);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("FEATURE_REQUIRES_PRO")) {
      return fail("Automatic reminders require Pro", 403, "FEATURE_REQUIRES_PRO");
    }
    console.error("[reminder rules]", error);
    return fail("Update failed", 500);
  }
}
