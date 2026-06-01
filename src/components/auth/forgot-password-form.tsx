"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AuthCard,
  AuthFooterLink,
  Button,
  Input,
} from "./auth-ui";
import { FormSubmitError } from "@/components/ui/form-submit-error";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setSubmitError(json.error ?? "Failed to send");
        setLoading(false);
        return;
      }

      setSuccess(json.data.message);
      setEmail("");
    } catch {
      setSubmitError("Network error. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Forgot password" subtitle="Enter your email and we will send a reset link.">
      {success ? (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
          {success}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <FormSubmitError message={submitError} />

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          loadingText="Sending…"
        >
          Send reset email
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      </p>

      <AuthFooterLink
        text="Don't have an account?"
        linkText="Register"
        href="/register"
      />
    </AuthCard>
  );
}
