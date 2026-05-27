import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** 表格行内操作按钮组容器 */
export function TableRowActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center divide-x divide-slate-200/80 rounded-lg border border-slate-200 bg-slate-50/50 p-0.5",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

const actionBase =
  "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md px-2 text-slate-500 transition-colors disabled:pointer-events-none disabled:opacity-40";

type TableActionLinkProps = {
  href: string;
  label: string;
  icon?: "view" | "edit";
};

export function TableActionLink({ href, label, icon = "view" }: TableActionLinkProps) {
  const Icon = icon === "edit" ? Pencil : Eye;

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        actionBase,
        "hover:bg-white hover:text-primary hover:shadow-sm"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="hidden text-xs font-medium sm:inline">{label}</span>
    </Link>
  );
}

type TableActionButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "edit" | "delete";
};

export function TableActionButton({
  label,
  onClick,
  disabled,
  variant,
}: TableActionButtonProps) {
  const Icon = variant === "delete" ? Trash2 : Pencil;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        actionBase,
        variant === "delete"
          ? "hover:bg-white hover:text-red-600 hover:shadow-sm"
          : "hover:bg-white hover:text-primary hover:shadow-sm"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="hidden text-xs font-medium sm:inline">{label}</span>
    </button>
  );
}
