import { Suspense } from "react";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { listClients } from "@/lib/services/client.service";
import { ClientsPageClient } from "@/components/clients/clients-page-client";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const result = await listClients(session.user.id);

  return (
    <Suspense fallback={<p className="text-sm text-slate-500">加载中...</p>}>
      <ClientsPageClient
        initialItems={result.items}
        initialMeta={result.meta}
      />
    </Suspense>
  );
}
