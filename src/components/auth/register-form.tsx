"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthCard,
  AuthDivider,
  AuthFooterLink,
  Button,
  Input,
} from "./auth-ui";
import { useNavigationLoading } from "@/components/ui/navigation-loading";
import { OAuthButtons } from "./oauth-buttons";
import type { OAuthConfig } from "@/lib/auth/providers";

type RegisterFormProps = {
  oauth: OAuthConfig;
};

export function RegisterForm({ oauth }: RegisterFormProps) {
  const router = useRouter();
  const { isNavigating, startNavigation } = useNavigationLoading();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasOAuth = oauth.google || oauth.github;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "注册失败");
        setLoading(false);
        return;
      }

      startNavigation();
      router.push("/login?registered=1");
    } catch {
      setError("网络错误，请稍后重试");
      setLoading(false);
    }
  }

  const submitting = loading || isNavigating;

  return (
    <AuthCard title="创建账户" subtitle="开始管理你的发票与收款">
      {hasOAuth ? (
        <>
          <OAuthButtons oauth={oauth} />
          <AuthDivider />
        </>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          密码至少 8 位，需包含字母和数字。
        </p>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          loading={submitting}
          loadingText="Creating account…"
        >
          Register
        </Button>
      </form>

      <AuthFooterLink
        text="Already have an account?"
        linkText="Login"
        href="/login"
      />
    </AuthCard>
  );
}
