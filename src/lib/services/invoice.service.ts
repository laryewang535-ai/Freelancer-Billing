import { prisma } from "@/lib/db";
import { generateInvoiceNumber, peekNextInvoiceSerial, formatInvoiceNumber } from "@/lib/services/invoice-number.service";
import { assertCanCreateInvoice, getUserPlan } from "@/lib/billing/plan-limits";
import { assertTemplateAllowed } from "@/lib/billing/template-access";
import {
  calcInvoiceTotals,
  percentToTaxRate,
  taxRateToPercent,
} from "@/lib/utils/invoice-calc";
import type { CreateInvoiceInput, UpdateInvoiceInput } from "@/lib/validators/invoice";
import type { InvoiceStatus, InvoiceTemplate, Prisma } from "@prisma/client";
import {
  CANCELLABLE_STATUSES,
  EDITABLE_STATUSES,
  SENDABLE_STATUSES,
} from "@/lib/constants/invoice-status";

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (!value) return 0;
  return Number(value.toString());
}

function emptyToNull(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (!value || value.trim() === "") return null;
  return value.trim();
}

/** 校验模板权限并规范化品牌字段 */
async function resolveTemplateFields(
  userId: string,
  input: {
    template?: InvoiceTemplate;
    brandPrimaryColor?: string | null;
    brandLogoUrl?: string | null;
    footerSignature?: string | null;
  }
) {
  const template = (input.template ?? "STANDARD") as InvoiceTemplate;
  const plan = await getUserPlan(userId);
  assertTemplateAllowed(plan, template);

  return {
    template,
    brandPrimaryColor: template === "BRANDING" ? emptyToNull(input.brandPrimaryColor) : null,
    brandLogoUrl: template === "BRANDING" ? emptyToNull(input.brandLogoUrl) : null,
    footerSignature: template === "BRANDING" ? emptyToNull(input.footerSignature) : null,
  };
}

/** 预览下一个编号（不消耗序列） */
export async function peekNextInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const next = await peekNextInvoiceSerial(userId);
  return formatInvoiceNumber(year, next);
}

/** Invoice 列表 */
export async function listInvoices(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    status?: InvoiceStatus;
    clientId?: string;
    search?: string;
  } = {}
) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.InvoiceWhereInput = {
    userId,
    deletedAt: null,
    ...(options.status ? { status: options.status } : {}),
    ...(options.clientId ? { clientId: options.clientId } : {}),
    ...(options.search
      ? {
          OR: [
            { invoiceNumber: { contains: options.search, mode: "insensitive" } },
            {
              client: {
                companyName: { contains: options.search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        client: {
          select: { id: true, companyName: true, contactName: true, email: true },
        },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientId: inv.clientId,
      clientName: inv.client.companyName,
      clientContactName: inv.client.contactName,
      clientEmail: inv.client.email,
      currency: inv.currency,
      totalAmount: decimalToNumber(inv.totalAmount),
      status: inv.status,
      dueDate: inv.dueDate,
      invoiceDate: inv.invoiceDate,
      createdAt: inv.createdAt,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** 获取 Invoice 详情 */
export async function getInvoiceById(userId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId, deletedAt: null },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      activities: { orderBy: { createdAt: "asc" } },
      user: {
        select: {
          name: true,
          companyName: true,
          email: true,
          website: true,
          phone: true,
          taxId: true,
          logoUrl: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
        },
      },
    },
  });

  if (!invoice) return null;

  return {
    ...invoice,
    subtotal: decimalToNumber(invoice.subtotal),
    taxRate: decimalToNumber(invoice.taxRate),
    taxRatePercent: taxRateToPercent(decimalToNumber(invoice.taxRate)),
    taxAmount: decimalToNumber(invoice.taxAmount),
    totalAmount: decimalToNumber(invoice.totalAmount),
    items: invoice.items.map((item) => ({
      ...item,
      quantity: decimalToNumber(item.quantity),
      unitPrice: decimalToNumber(item.unitPrice),
      lineTotal: decimalToNumber(item.lineTotal),
    })),
  };
}

/** 创建 Invoice */
export async function createInvoice(userId: string, input: CreateInvoiceInput) {
  await assertCanCreateInvoice(userId);

  const client = await prisma.client.findFirst({
    where: { id: input.clientId, userId, deletedAt: null },
  });
  if (!client) throw new Error("CLIENT_NOT_FOUND");

  const totals = calcInvoiceTotals(input.items, input.taxRatePercent ?? 0);
  const invoiceDate = input.invoiceDate ?? new Date();
  const templateFields = await resolveTemplateFields(userId, input);

  return prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(userId, tx);
    const invoice = await tx.invoice.create({
      data: {
        userId,
        clientId: input.clientId,
        invoiceNumber,
        status: "DRAFT",
        template: templateFields.template,
        paperSize: input.paperSize ?? "A4",
        brandPrimaryColor: templateFields.brandPrimaryColor,
        brandLogoUrl: templateFields.brandLogoUrl,
        footerSignature: templateFields.footerSignature,
        currency: input.currency,
        subtotal: totals.subtotal,
        taxRate: percentToTaxRate(input.taxRatePercent ?? 0),
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        invoiceDate,
        dueDate: input.dueDate,
        paymentTerms: emptyToNull(input.paymentTerms) ?? "Net 30",
        notes: emptyToNull(input.notes),
        items: {
          create: input.items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: calcInvoiceTotals([item], 0).subtotal,
            sortOrder: index,
          })),
        },
        activities: {
          create: {
            userId,
            type: "CREATED",
            message: "Invoice created",
          },
        },
      },
      include: {
        client: { select: { companyName: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return invoice;
  });
}

/** 更新 Invoice（仅 Draft） */
export async function updateInvoice(
  userId: string,
  invoiceId: string,
  input: UpdateInvoiceInput
) {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId, deletedAt: null },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) return null;
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    throw new Error("INVOICE_NOT_EDITABLE");
  }

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, userId, deletedAt: null },
    });
    if (!client) throw new Error("CLIENT_NOT_FOUND");
  }

  const taxRatePercent =
    input.taxRatePercent ??
    taxRateToPercent(decimalToNumber(existing.taxRate));

  const itemInputs =
    input.items ??
    existing.items.map((i) => ({
      description: i.description,
      quantity: decimalToNumber(i.quantity),
      unitPrice: decimalToNumber(i.unitPrice),
    }));

  const totals = calcInvoiceTotals(itemInputs, taxRatePercent);

  const templateFields = input.template
    ? await resolveTemplateFields(userId, input)
    : null;

  return prisma.$transaction(async (tx) => {
    if (input.items) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    }

    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        clientId: input.clientId,
        currency: input.currency,
        template: templateFields?.template,
        paperSize: input.paperSize,
        brandPrimaryColor: templateFields?.brandPrimaryColor,
        brandLogoUrl: templateFields?.brandLogoUrl,
        footerSignature: templateFields?.footerSignature,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        paymentTerms: emptyToNull(input.paymentTerms),
        notes: emptyToNull(input.notes),
        subtotal: totals.subtotal,
        taxRate: percentToTaxRate(taxRatePercent),
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        ...(input.items
          ? {
              items: {
                create: input.items.map((item, index) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  lineTotal: calcInvoiceTotals([item], 0).subtotal,
                  sortOrder: index,
                })),
              },
            }
          : {}),
        activities: {
          create: {
            userId,
            type: "UPDATED",
            message: "Invoice updated",
          },
        },
      },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
        activities: { orderBy: { createdAt: "asc" } },
      },
    });

    return invoice;
  });
}

/** 发送 Invoice（状态 → SENT，邮件在阶段 6 实现） */
export async function sendInvoice(userId: string, invoiceId: string) {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId, deletedAt: null },
  });
  if (!existing) return null;
  if (!SENDABLE_STATUSES.includes(existing.status)) {
    throw new Error("INVOICE_NOT_SENDABLE");
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      activities: {
        create: {
          userId,
          type: "SENT",
          message: "Invoice marked as sent",
        },
      },
    },
  });
}

/** 取消 Invoice */
export async function cancelInvoice(userId: string, invoiceId: string) {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId, deletedAt: null },
  });
  if (!existing) return null;
  if (!CANCELLABLE_STATUSES.includes(existing.status)) {
    throw new Error("INVOICE_NOT_CANCELLABLE");
  }
  if (existing.status === "PAID") {
    throw new Error("INVOICE_ALREADY_PAID");
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "CANCELLED",
      activities: {
        create: {
          userId,
          type: "CANCELLED",
          message: "Invoice cancelled",
        },
      },
    },
  });
}

/** 复制 Invoice */
export async function duplicateInvoice(userId: string, invoiceId: string) {
  await assertCanCreateInvoice(userId);

  const source = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId, deletedAt: null },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) return null;

  return prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(userId, tx);
    const invoice = await tx.invoice.create({
      data: {
        userId,
        clientId: source.clientId,
        invoiceNumber,
        status: "DRAFT",
        template: source.template,
        paperSize: source.paperSize,
        currency: source.currency,
        subtotal: source.subtotal,
        taxRate: source.taxRate,
        taxAmount: source.taxAmount,
        totalAmount: source.totalAmount,
        invoiceDate: new Date(),
        dueDate: source.dueDate,
        paymentTerms: source.paymentTerms,
        notes: source.notes,
        items: {
          create: source.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            sortOrder: item.sortOrder,
          })),
        },
        activities: {
          create: [
            {
              userId,
              type: "DUPLICATED",
              message: `Duplicated from ${source.invoiceNumber}`,
              metadata: { sourceInvoiceId: source.id },
            },
            {
              userId,
              type: "CREATED",
              message: "Invoice created",
            },
          ],
        },
      },
    });

    return invoice;
  });
}

/** 软删除 Invoice（仅 Draft / Cancelled） */
export async function deleteInvoice(userId: string, invoiceId: string) {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId, deletedAt: null },
  });
  if (!existing) return null;

  if (!["DRAFT", "CANCELLED"].includes(existing.status)) {
    throw new Error("INVOICE_NOT_DELETABLE");
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { deletedAt: new Date() },
  });
}
