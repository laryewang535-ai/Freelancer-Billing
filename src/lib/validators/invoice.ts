import { z } from "zod";
import { isValidCurrency } from "@/lib/constants/currencies";

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Service description is required").max(2000),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  currency: z.string().refine(isValidCurrency, "Unsupported currency"),
  taxRatePercent: z.coerce.number().min(0).max(100).default(0),
  dueDate: z.coerce.date({ message: "Please select a due date" }),
  invoiceDate: z.coerce.date().optional(),
  paymentTerms: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  template: z
    .enum(["STANDARD", "MINIMAL", "CORPORATE", "BRANDING"])
    .optional()
    .default("STANDARD"),
  paperSize: z.enum(["A4", "LETTER"]).optional().default("A4"),
  brandPrimaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Brand color must use #RRGGBB format")
    .optional()
    .nullable(),
  brandLogoUrl: z.string().trim().max(500).optional().nullable(),
  footerSignature: z.string().trim().max(500).optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const invoiceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED"])
    .optional(),
  clientId: z.string().optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
