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
      <AuthCard title="链接无效" subtitle="请从邮件中打开完整链接，或重新申请重置">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          缺少重置令牌。链接可能已损坏或已被使用。
        </p>
        <p className="mt-6 text-center">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            重新申请重置密码
          </Link>
        </p>
        <AuthFooterLink text="返回" linkText="Login" href="/login" />
      </AuthCard>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (password !== confirmPassword) {
      setSubmitError("两次输入的密码不一致");
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
        setSubmitError(json.error ?? "重置失败");
        setLoading(false);
        return;
      }

      startNavigation();
      router.push("/login?reset=1");
    } catch {
      setSubmitError("网络错误，请稍后重试");
      setLoading(false);
    }
  }

  const submitting = loading || isNavigating;

  return (
    <AuthCard title="设置新密码" subtitle="请输入新的登录密码">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="新密码"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="确认新密码"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <p className="text-xs text-slate-500">密码至少 8 位，需包含字母和数字。</p>

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

      <AuthFooterLink text="想起密码了？" linkText="Login" href="/login" />
    </AuthCard>
  );
}
