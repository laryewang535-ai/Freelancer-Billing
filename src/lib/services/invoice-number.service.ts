import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** 格式化 Invoice 编号 */
export function formatInvoiceNumber(year: number, serial: number): string {
  return `INV-${year}-${String(serial).padStart(4, "0")}`;
}

/** 从已有 Invoice 解析当年最大序号 */
async function getMaxInvoiceSerial(
  userId: string,
  year: number,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<number> {
  const prefix = `INV-${year}-`;
  const latest = await client.invoice.findFirst({
    where: {
      userId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  if (!latest) return 0;
  const serial = parseInt(latest.invoiceNumber.slice(-4), 10);
  return Number.isFinite(serial) ? serial : 0;
}

/** 计算下一个序号（不写入数据库） */
export async function peekNextInvoiceSerial(userId: string): Promise<number> {
  const year = new Date().getFullYear();
  const [seq, maxFromInvoices] = await Promise.all([
    prisma.invoiceSequence.findUnique({
      where: { userId_year: { userId, year } },
    }),
    getMaxInvoiceSerial(userId, year),
  ]);
  return Math.max(seq?.lastNumber ?? 0, maxFromInvoices) + 1;
}

/**
 * 原子生成 Invoice 编号：INV-{year}-{4位序号}
 * 与已有 Invoice 和序列对齐，避免重复编号；可传入事务 client 与创建同事务
 */
export async function generateInvoiceNumber(
  userId: string,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const year = new Date().getFullYear();

  const assign = async (client: Prisma.TransactionClient) => {
    const maxFromInvoices = await getMaxInvoiceSerial(userId, year, client);
    const existing = await client.invoiceSequence.findUnique({
      where: { userId_year: { userId, year } },
    });

    const nextNumber = Math.max(existing?.lastNumber ?? 0, maxFromInvoices) + 1;

    if (existing) {
      await client.invoiceSequence.update({
        where: { userId_year: { userId, year } },
        data: { lastNumber: nextNumber },
      });
    } else {
      await client.invoiceSequence.create({
        data: { userId, year, lastNumber: nextNumber },
      });
    }

    return formatInvoiceNumber(year, nextNumber);
  };

  if (tx) return assign(tx);
  return prisma.$transaction(assign);
}
