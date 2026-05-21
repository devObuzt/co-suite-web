"use client";
import { useAuthStore } from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Settings, LogOut, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-card/40 flex-col p-4 shrink-0">
        <div className="text-lg font-bold text-foreground mb-8 px-2">co-Suite</div>
        <nav className="flex-1 space-y-1">
          <SideLink href="/suites" icon={<LayoutDashboard size={16} />} label={t("nav.dashboard")} active={pathname === "/suites"} />
          <SideLink href="/suite/new" icon={<Plus size={16} />} label={t("nav.newSuite")} active={pathname === "/suite/new"} />
          <SideLink href="/settings" icon={<Settings size={16} />} label={t("nav.settings")} active={pathname === "/settings"} />
        </nav>
        <div className="border-t border-border pt-4 mt-4">
          <div className="text-sm text-muted-foreground px-2 mb-2 truncate">{user.email}</div>
          <LanguageSwitcher />
          <div className="px-0 mt-2">
            <ThemeSwitcher />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { logout(); router.push("/login"); }}
            className="w-full justify-start text-muted-foreground hover:text-foreground gap-2 mt-1"
          >
            <LogOut size={14} /> {t("nav.signOut")}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="md:hidden sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/suites" className="text-foreground font-semibold">co-Suite</Link>
            <div className="flex items-center gap-1">
              <ThemeSwitcher compact />
              <IconLink href="/suites" icon={<LayoutDashboard size={17} />} active={pathname === "/suites"} />
              <IconLink href="/suite/new" icon={<Plus size={17} />} active={pathname === "/suite/new"} />
              <IconLink href="/settings" icon={<Settings size={17} />} active={pathname === "/settings"} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { logout(); router.push("/login"); }}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                aria-label={t("nav.signOut")}
              >
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

function SideLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function IconLink({ href, icon, active }: { href: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={`grid h-9 w-9 place-items-center rounded-md transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}
    </Link>
  );
}
