import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <ForgotPasswordForm />
    </main>
  );
}
