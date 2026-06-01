import { z } from "zod";

export const clientBaseSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  contactName: z.string().trim().min(1, "Contact name is required").max(100),
  email: z.string().trim().email("Invalid email address"),
  country: z.string().trim().min(2, "Please select a country").max(10),
  address: z.string().trim().max(500).optional().nullable(),
  vatNumber: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const createClientSchema = clientBaseSchema;
export const updateClientSchema = clientBaseSchema.partial();

export const clientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientListQuery = z.infer<typeof clientListQuerySchema>;

function emptyToNull(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (!value || value.trim() === "") return null;
  return value.trim();
}

/** 规范化Client写入数据 */
export function normalizeClientInput<T extends CreateClientInput | UpdateClientInput>(
  data: T
): T {
  return {
    ...data,
    companyName: data.companyName?.trim(),
    contactName: data.contactName?.trim(),
    email: data.email?.trim().toLowerCase(),
    address: emptyToNull(data.address) as T["address"],
    vatNumber: emptyToNull(data.vatNumber) as T["vatNumber"],
    notes: emptyToNull(data.notes) as T["notes"],
  };
}
