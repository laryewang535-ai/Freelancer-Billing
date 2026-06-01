import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { generateInvoiceFromPrompt, optimizeDescription } from "@/lib/services/ai-invoice.service";
import { z } from "zod";

const invoiceSchema = z.object({
  prompt: z.string().trim().min(10, "Description must be at least 10 characters").max(2000),
});

const optimizeSchema = z.object({
  description: z.string().trim().min(1).max(2000),
});

/** AI 生成 Invoice */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const action = body.action ?? "generate";

    if (action === "optimize") {
      const parsed = optimizeSchema.safeParse(body);
      if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);
      const result = await optimizeDescription(user.id, parsed.data.description);
      return ok({ description: result });
    }

    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid parameters", 400);

    const result = await generateInvoiceFromPrompt(user.id, parsed.data.prompt);
    return ok(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("FEATURE_REQUIRES_PRO")) {
        return fail("AI Invoice requires Pro", 403, "FEATURE_REQUIRES_PRO");
      }
      if (error.message === "AI_LIMIT_REACHED") {
        return fail("Monthly AI usage limit reached", 403, "AI_LIMIT_REACHED");
      }
      if (error.message === "AI_NOT_CONFIGURED") {
        return fail("OpenAI is not configured", 503, "AI_NOT_CONFIGURED");
      }
      const msg = error.message.toLowerCase();
      if (msg.includes("timed out") || msg.includes("timeout")) {
        return fail(
          "OpenAI request timed out. Check OPENAI_HTTP_PROXY or your VPN.",
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
          "Unable to connect to OpenAI. Check OPENAI_HTTP_PROXY or OPENAI_BASE_URL.",
          503,
          "AI_NETWORK_ERROR"
        );
      }
    }
    console.error("[ai invoice]", error instanceof Error ? error.message : error);
    return fail("AI generation failed", 500);
  }
}
