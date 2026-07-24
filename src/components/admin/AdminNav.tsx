"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Languages, LayoutDashboard, Tags, Users, WandSparkles } from "lucide-react";

type AdminNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** When true, the link is active only on an exact pathname match (used for the overview root). */
  exact?: boolean;
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard size={15} />, exact: true },
  { href: "/admin/languages", label: "Languages", icon: <Languages size={15} /> },
  { href: "/admin/prompts", label: "Prompts", icon: <WandSparkles size={15} /> },
  { href: "/admin/services", label: "Services", icon: <Tags size={15} /> },
  { href: "/admin/leads", label: "Leads", icon: <Users size={15} /> },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "os-nav-active" : "os-nav-link"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
