"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { NavigationLoadingProvider } from "@/components/ui/navigation-loading";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
      </Suspense>
    </SessionProvider>
  );
}
