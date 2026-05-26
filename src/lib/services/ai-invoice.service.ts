import OpenAI from "openai";
import { execSync } from "child_process";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { prisma } from "@/lib/db";
import { getUserPlan } from "@/lib/billing/plan-limits";
import { getPlanFeatures } from "@/lib/billing/features";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function getOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

/** macOS 系统 HTTP 代理（365vpn / Clash 等开启「系统代理」时可自动读取） */
function getMacSystemHttpProxy(): string | undefined {
  if (process.platform !== "darwin") return undefined;
  try {
    const output = execSync("scutil --proxy", { encoding: "utf8", timeout: 2000 });
    const enabled = /HTTPEnable\s*:\s*1/.test(output) || /HTTPSEnable\s*:\s*1/.test(output);
    if (!enabled) return undefined;
    const host = output.match(/(?:HTTPS|HTTP)Proxy\s*:\s*(\S+)/)?.[1];
    const port = output.match(/(?:HTTPS|HTTP)Port\s*:\s*(\d+)/)?.[1];
    if (host && port) return `http://${host}:${port}`;
  } catch {
    // 读取失败则忽略
  }
  return undefined;
}

/** 读取 HTTP 代理：环境变量优先，macOS 可回退系统代理 */
function getOpenAiHttpProxy(): string | undefined {
  return (
    process.env.OPENAI_HTTP_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    getMacSystemHttpProxy()
  );
}

/** gpt-5 系列不支持自定义 temperature / max_tokens */
function usesGpt5Api(model: string) {
  return /^gpt-5/i.test(model);
}

function createProxyFetch(proxyUrl: string): typeof fetch {
  const dispatcher = new ProxyAgent(proxyUrl);
  return ((url: RequestInfo | URL, init?: RequestInit) =>
    undiciFetch(url as string, {
      ...init,
      dispatcher,
    } as Parameters<typeof undiciFetch>[1])) as unknown as typeof fetch;
}

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) {
    const proxyUrl = getOpenAiHttpProxy();
    const clientOptions: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE_URL,
      timeout: 60_000,
    };

    if (proxyUrl) {
      clientOptions.fetch = createProxyFetch(proxyUrl);
    }

    openai = new OpenAI(clientOptions);
  }
  return openai;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** 统计当月 AI 使用次数 */
async function countAiThisMonth(userId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return prisma.aiGenerationLog.count({
    where: { userId, createdAt: { gte: monthStart } },
  });
}

export type AiInvoiceResult = {
  clientHint: string;
  currency: string;
  taxRatePercent: number;
  dueInDays: number;
  paymentTerms: string;
  notes: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
};

const SYSTEM_PROMPT = `You are an invoice assistant for freelancers. Given a natural language description, output JSON only with this schema:
{
  "clientHint": "company or client name mentioned",
  "currency": "USD|EUR|GBP|AUD|CAD|SGD|JPY|HKD|CNY",
  "taxRatePercent": 0,
  "dueInDays": 30,
  "paymentTerms": "Net 30",
  "notes": "optional notes",
  "items": [{ "description": "service", "quantity": 1, "unitPrice": 1000 }]
}`;

/** AI 生成 Invoice 结构化数据 */
export async function generateInvoiceFromPrompt(userId: string, prompt: string) {
  const plan = await getUserPlan(userId);
  const features = getPlanFeatures(plan);

  if (!features.aiInvoice) {
    throw new Error("FEATURE_REQUIRES_PRO:aiInvoice");
  }

  const used = await countAiThisMonth(userId);
  if (used >= features.aiGenerationsPerMonth) {
    throw new Error("AI_LIMIT_REACHED");
  }

  const client = getOpenAI();
  if (!client) throw new Error("AI_NOT_CONFIGURED");

  const model = getOpenAiModel();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    ...(usesGpt5Api(model) ? {} : { temperature: 0.3 }),
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI_EMPTY_RESPONSE");

  const result = JSON.parse(content) as AiInvoiceResult;

  await prisma.aiGenerationLog.create({
    data: {
      userId,
      prompt,
      resultJson: result,
      model: completion.model,
      tokensUsed: completion.usage?.total_tokens ?? null,
    },
  });

  return result;
}

/** 优化服务描述 */
export async function optimizeDescription(userId: string, description: string) {
  const plan = await getUserPlan(userId);
  if (!getPlanFeatures(plan).aiInvoice) {
    throw new Error("FEATURE_REQUIRES_PRO:aiInvoice");
  }

  const client = getOpenAI();
  if (!client) throw new Error("AI_NOT_CONFIGURED");

  const model = getOpenAiModel();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "Improve the invoice line item description to be professional and concise. Return plain text only.",
      },
      { role: "user", content: description },
    ],
    ...(usesGpt5Api(model)
      ? { max_completion_tokens: 200 }
      : { temperature: 0.4, max_tokens: 200 }),
  });

  const optimized = completion.choices[0]?.message?.content?.trim();
  if (!optimized) throw new Error("AI_EMPTY_RESPONSE");

  await prisma.aiGenerationLog.create({
    data: {
      userId,
      prompt: description,
      resultJson: { optimized },
      model: completion.model,
      tokensUsed: completion.usage?.total_tokens ?? null,
    },
  });

  return optimized;
}
