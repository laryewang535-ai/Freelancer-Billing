"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils/cn";

type NavigationLoadingContextValue = {
  isNavigating: boolean;
  /** 编程式跳转前调用（如 login 后 router.push） */
  startNavigation: () => void;
};

const NavigationLoadingContext =
  createContext<NavigationLoadingContextValue | null>(null);

export function useNavigationLoading() {
  const ctx = useContext(NavigationLoadingContext);
  if (!ctx) {
    throw new Error("useNavigationLoading must be used within NavigationLoadingProvider");
  }
  return ctx;
}

/** 可选：无 Provider 时静默降级 */
export function useNavigationLoadingOptional() {
  return useContext(NavigationLoadingContext);
}

function NavigationLoadingUI({
  active,
  progress,
}: {
  active: boolean;
  progress: number;
}) {
  return (
    <>
      {/* 顶部进度条 */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-[200] h-1 transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0"
        )}
      >
        <div
          className="relative h-full overflow-hidden shadow-[0_2px_16px_rgba(37,99,235,0.45)] transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <div className="absolute inset-0 animate-navigation-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
      </div>

      {/* 全屏加载层：跳转完成前一直显示 */}
      <div
        aria-live="polite"
        aria-busy={active}
        className={cn(
          "fixed inset-0 z-[190] flex items-center justify-center transition-opacity duration-300",
          active ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="absolute inset-0 bg-white/55 backdrop-blur-[3px]" />
        <div className="relative flex flex-col items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-10 py-8 shadow-2xl shadow-slate-300/40">
          <LoadingSpinner size="lg" prominent label="Loading page" />
          <p className="text-sm font-medium text-slate-600">Loading…</p>
        </div>
      </div>
    </>
  );
}

export function NavigationLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  const isNavigatingRef = useRef(false);
  const isFirstRouteRef = useRef(true);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const clearCompleteTimer = useCallback(() => {
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
  }, []);

  const finishNavigation = useCallback(() => {
    if (!isNavigatingRef.current) return;

    clearProgressTimer();
    clearCompleteTimer();
    setProgress(100);

    completeTimerRef.current = setTimeout(() => {
      isNavigatingRef.current = false;
      setActive(false);
      setProgress(0);
    }, 400);
  }, [clearProgressTimer, clearCompleteTimer]);

  const startNavigation = useCallback(() => {
    if (isNavigatingRef.current) return;

    clearProgressTimer();
    clearCompleteTimer();
    isNavigatingRef.current = true;
    setActive(true);
    setProgress(10);

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return 92;
        const step = Math.max(1.5, (92 - prev) * 0.12);
        return Math.min(92, prev + step);
      });
    }, 160);
  }, [clearProgressTimer, clearCompleteTimer]);

  // 路由已切换：等新页面绘制后再结束加载
  useEffect(() => {
    if (isFirstRouteRef.current) {
      isFirstRouteRef.current = false;
      return;
    }

    if (!isNavigatingRef.current) return;

    let cancelled = false;

    const done = () => {
      if (!cancelled) finishNavigation();
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        completeTimerRef.current = setTimeout(done, 80);
      });
    });

    return () => {
      cancelled = true;
      clearCompleteTimer();
    };
  }, [pathname, searchParams, finishNavigation, clearCompleteTimer]);

  // 点击站内链接时立即开始加载
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor?.href) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      startNavigation();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [startNavigation]);

  useEffect(() => {
    return () => {
      clearProgressTimer();
      clearCompleteTimer();
    };
  }, [clearProgressTimer, clearCompleteTimer]);

  return (
    <NavigationLoadingContext.Provider
      value={{ isNavigating: active, startNavigation }}
    >
      <NavigationLoadingUI active={active} progress={progress} />
      {children}
    </NavigationLoadingContext.Provider>
  );
}
