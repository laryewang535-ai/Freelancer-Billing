import { Suspense } from "react";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
