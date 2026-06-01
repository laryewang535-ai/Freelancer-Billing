"use client";

import { signIn } from "next-auth/react";
import { Button } from "./auth-ui";
import type { OAuthConfig } from "@/lib/auth/providers";

type OAuthButtonsProps = {
  oauth: OAuthConfig;
  callbackUrl?: string;
};

export function OAuthButtons({ oauth, callbackUrl = "/dashboard" }: OAuthButtonsProps) {
  if (!oauth.google && !oauth.github) {
    return null;
  }

  return (
    <div className="space-y-3">
      {oauth.google ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continue with Google
        </Button>
      ) : null}
      {oauth.github ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("github", { callbackUrl })}
        >
          Continue with GitHub
        </Button>
      ) : null}
    </div>
  );
}
