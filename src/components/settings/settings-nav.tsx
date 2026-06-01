"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/reminders", label: "Reminder settings" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-4 border-b border-slate-200 pb-3 text-sm">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            pathname === item.href || pathname.startsWith(`${item.href}/`)
              ? "font-medium text-primary"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
