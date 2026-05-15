"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS: Array<{ href: string; label: string }> = [
  { href: "/developer", label: "Tables" },
  { href: "/developer/diagram", label: "Diagram" },
];

export function DeveloperNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex items-center gap-1 border-b border-border/40">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
