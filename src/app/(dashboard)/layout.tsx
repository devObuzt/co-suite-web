"use client";
import { useAuthStore } from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Settings, LogOut, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();

  useEffect(() => {
    // Wait for Zustand to finish reading localStorage before redirecting
    if (_hasHydrated && !user) router.push("/login");
  }, [_hasHydrated, user, router]);

  // Show spinner while auth state is loading from localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-zinc-800 flex flex-col p-4 shrink-0">
        <div className="text-lg font-bold text-white mb-8 px-2">co-Suite</div>
        <nav className="flex-1 space-y-1">
          <SideLink href="/dashboard" icon={<LayoutDashboard size={16} />} label={t("nav.dashboard")} active={pathname === "/dashboard"} />
          <SideLink href="/suite/new" icon={<Plus size={16} />} label={t("nav.newSuite")} active={pathname === "/suite/new"} />
          <SideLink href="/settings" icon={<Settings size={16} />} label={t("nav.settings")} active={pathname === "/settings"} />
        </nav>
        <div className="border-t border-zinc-800 pt-4 mt-4">
          <div className="text-sm text-zinc-400 px-2 mb-2 truncate">{user.email}</div>
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { logout(); router.push("/login"); }}
            className="w-full justify-start text-zinc-400 hover:text-white gap-2 mt-1"
          >
            <LogOut size={14} /> {t("nav.signOut")}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function SideLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
        active ? "bg-indigo-950 text-indigo-300" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
