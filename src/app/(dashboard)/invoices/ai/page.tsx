import { auth } from "../../../../../auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { peekNextInvoiceNumber } from "@/lib/services/invoice.service";
import { AiInvoiceClient } from "@/components/ai/ai-invoice-client";
import type { PreviewClient } from "@/components/invoices/invoice-preview";

export default async function AiInvoicePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [clients, user, previewNumber] = await Promise.all([
    prisma.client.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { companyName: "asc" },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        country: true,
        address: true,
        vatNumber: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
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
    }),
    peekNextInvoiceNumber(session.user.id),
  ]);

  if (clients.length === 0) {
    redirect("/clients");
  }

  const clientsMap = Object.fromEntries(
    clients.map((c) => [c.id, c as PreviewClient])
  ) as Record<string, PreviewClient>;

  return (
    <AiInvoiceClient
      previewNumber={previewNumber}
      seller={user ?? {}}
      userPlan={session.user.plan ?? "FREE"}
      clients={clients.map((c) => ({ id: c.id, companyName: c.companyName }))}
      clientsMap={clientsMap}
    />
  );
}
