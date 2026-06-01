import { Suspense } from "react";
import { auth } from "../../../../../auth";
import { redirect } from "next/navigation";
import { BillingSettingsClient } from "@/components/settings/billing-settings-client";

export default async function BillingSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
      <BillingSettingsClient initialPlan={session.user.plan ?? "FREE"} />
    </Suspense>
  );
}
