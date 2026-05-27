import { cn } from "@/lib/utils/cn";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  /** 用于按钮内联，不包裹额外布局 */
  inline?: boolean;
  /** 浅色按钮用 dark，深色按钮用 light */
  tone?: "light" | "dark";
  /** 全屏导航加载：更大、对比更强 */
  prominent?: boolean;
};

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-9 w-9 border-[3px]",
  lg: "h-12 w-12 border-[3.5px]",
};

/** 品牌色圆环加载指示器 */
export function LoadingSpinner({
  size = "md",
  className,
  label = "Loading",
  inline = false,
  tone = "dark",
  prominent = false,
}: LoadingSpinnerProps) {
  const ring = (
    <span
      className={cn(
        "inline-block animate-spin rounded-full",
        prominent
          ? "border-blue-100 border-t-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.35)]"
          : inline && tone === "light"
            ? "border-2 border-white/40 border-t-white"
            : "border-2 border-slate-300 border-t-blue-600",
        sizeMap[size]
      )}
    />
  );

  if (prominent) {
    return (
      <div role="status" aria-label={label} className={cn("relative", className)}>
        <span
          className="absolute inset-0 animate-ping rounded-full bg-blue-400/20"
          style={{ margin: "-6px" }}
        />
        {ring}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (inline) {
    return (
      <span role="status" aria-label={label} className={className}>
        {ring}
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("inline-flex flex-col items-center gap-3", className)}
    >
      {ring}
      <span className="sr-only">{label}</span>
    </div>
  );
}
