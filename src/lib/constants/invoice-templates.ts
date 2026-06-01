import type { InvoiceTemplate } from "@prisma/client";

export const INVOICE_TEMPLATES: Array<{
  value: InvoiceTemplate;
  label: string;
  description: string;
  proOnly: boolean;
}> = [
  {
    value: "STANDARD",
    label: "Standard",
    description: "Classic blue layout for most invoices",
    proOnly: false,
  },
  {
    value: "MINIMAL",
    label: "Minimal",
    description: "Minimal black-and-white layout",
    proOnly: true,
  },
  {
    value: "CORPORATE",
    label: "Corporate",
    description: "Dark header with a corporate feel",
    proOnly: true,
  },
  {
    value: "BRANDING",
    label: "Branding",
    description: "Custom brand color and logo",
    proOnly: true,
  },
];

export const PAPER_SIZES = [
  { value: "A4" as const, label: "A4 (International)" },
  { value: "LETTER" as const, label: "Letter (US)" },
];
