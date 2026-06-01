"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthCard,
  AuthFooterLink,
  Button,
  Input,
} from "./auth-ui";
import { FormSubmitError } from "@/components/ui/form-submit-error";
import { useNavigationLoading } from "@/components/ui/navigation-loading";

export function ResetPasswordForm() {
  const router = useRouter();
  const { isNavigating, startNavigation } = useNavigationLoading();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthCard title="Invalid link" subtitle="Open the full link from your email, or request a new reset link.">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The reset token is missing. The link may be broken or already used.
        </p>
        <p className="mt-6 text-center">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Request a new password reset
          </Link>
        </p>
        <AuthFooterLink text="Back to" linkText="Login" href="/login" />
      </AuthCard>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setSubmitError(json.error ?? "Password reset failed");
        setLoading(false);
        return;
      }

      startNavigation();
      router.push("/login?reset=1");
    } catch {
      setSubmitError("Network error. Please try again shortly.");
      setLoading(false);
    }
  }

  const submitting = loading || isNavigating;

  return (
    <AuthCard title="Set a new password" subtitle="Enter your new sign-in password.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <p className="text-xs text-slate-500">Password must be at least 8 characters and include letters and numbers.</p>

        <FormSubmitError message={submitError} />

        <Button
          type="submit"
          className="w-full"
          loading={submitting}
          loadingText="Updating…"
        >
          Update password
        </Button>
      </form>

      <AuthFooterLink text="Remembered your password?" linkText="Login" href="/login" />
    </AuthCard>
  );
}
