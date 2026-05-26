import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { generateInvoiceFromPrompt, optimizeDescription } from "@/lib/services/ai-invoice.service";
import { z } from "zod";

const invoiceSchema = z.object({
  prompt: z.string().trim().min(10, "描述至少 10 个字符").max(2000),
});

const optimizeSchema = z.object({
  description: z.string().trim().min(1).max(2000),
});

/** AI 生成 Invoice */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("未登录", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const action = body.action ?? "generate";

    if (action === "optimize") {
      const parsed = optimizeSchema.safeParse(body);
      if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "参数无效", 400);
      const result = await optimizeDescription(user.id, parsed.data.description);
      return ok({ description: result });
    }

    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "参数无效", 400);

    const result = await generateInvoiceFromPrompt(user.id, parsed.data.prompt);
    return ok(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("FEATURE_REQUIRES_PRO")) {
        return fail("AI Invoice 需要 Pro 计划", 403, "FEATURE_REQUIRES_PRO");
      }
      if (error.message === "AI_LIMIT_REACHED") {
        return fail("本月 AI 次数已用完", 403, "AI_LIMIT_REACHED");
      }
      if (error.message === "AI_NOT_CONFIGURED") {
        return fail("OpenAI 未配置", 503, "AI_NOT_CONFIGURED");
      }
      const msg = error.message.toLowerCase();
      if (msg.includes("timed out") || msg.includes("timeout")) {
        return fail(
          "OpenAI 请求超时，请检查 OPENAI_HTTP_PROXY 或 VPN 是否可用",
          504,
          "AI_TIMEOUT"
        );
      }
      if (
        msg.includes("connection") ||
        msg.includes("fetch failed") ||
        msg.includes("econnrefused") ||
        msg.includes("enotfound")
      ) {
        return fail(
          "无法连接 OpenAI，请检查 OPENAI_HTTP_PROXY 或 OPENAI_BASE_URL",
          503,
          "AI_NETWORK_ERROR"
        );
      }
    }
    console.error("[ai invoice]", error instanceof Error ? error.message : error);
    return fail("AI 生成失败", 500);
  }
}
