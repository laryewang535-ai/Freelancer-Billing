import { z } from "zod";

export const sendInvoiceActionSchema = z.object({
  action: z.literal("send"),
  clientId: z.string().min(1, "Please select a recipient client").optional(),
  message: z.string().trim().min(1, "Please enter an email message").max(5000).optional(),
});
