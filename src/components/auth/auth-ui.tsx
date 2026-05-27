import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  /** 提交中：显示转圈并禁用 */
  loading?: boolean;
  /** 加载时文案，不传则保留 children 文字 */
  loadingText?: string;
};

const variants = {
  primary:
    "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800",
  secondary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
  outline:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const spinnerTone =
    variant === "primary" || variant === "secondary" ? "light" : "dark";

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner
            size="sm"
            inline
            tone={spinnerTone}
            label={loadingText ?? "Loading"}
          />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "app-input",
          error && "border-error focus:border-error focus:ring-error/20",
          className
        )}
        {...props}
      />
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md animate-fade-in-up">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-500/30">
            F
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Freelancer Billing
          </span>
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>
      <div className="app-card p-8 shadow-md shadow-slate-200/50">
        {children}
      </div>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white px-2 text-slate-500">或</span>
      </div>
    </div>
  );
}

export function AuthFooterLink({
  text,
  linkText,
  href,
}: {
  text: string;
  linkText: string;
  href: string;
}) {
  return (
    <p className="mt-6 text-center text-sm text-slate-600">
      {text}{" "}
      <Link href={href} className="font-medium text-primary hover:underline">
        {linkText}
      </Link>
    </p>
  );
}
