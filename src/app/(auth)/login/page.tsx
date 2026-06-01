import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { LoginForm } from "@/components/auth/login-form";
import { getOAuthConfig } from "@/lib/auth/providers";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const oauth = getOAuthConfig();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
        <LoginForm oauth={oauth} />
      </Suspense>
    </main>
  );
}
