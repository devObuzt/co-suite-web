"use client";
import { useAuthStore } from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Settings, LogOut, Plus, Menu, X, Sparkles, Layers, ShieldCheck } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageContext";
import { BrandMark } from "@/components/BrandMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { SuiteNav } from "@/components/suite/SuiteNav";
import { api, Suite } from "@/lib/api";
import { FrozenScreen } from "@/components/FrozenScreen";
import { FunnelChrome } from "@/components/funnel/FunnelChrome";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, _hasHydrated, setUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [mobileSuiteOpen, setMobileSuiteOpen] = useState(false);
  const [suites, setSuites] = useState<Suite[]>([]);
  const suiteMatch = pathname.match(/^\/suite\/([^/]+)/);
  const activeSuiteId = suiteMatch?.[1] && suiteMatch[1] !== "new" ? suiteMatch[1] : null;
  const hasSuites = suites.length > 0;
  const suitesNavHref = hasSuites ? "/suites" : "/suite/new";
  const suitesNavLabel = hasSuites ? "My Suites" : t("nav.newSuite");
  const suitesNavActive = hasSuites ? pathname === "/suites" : pathname === "/suite/new";
  const suitesNavIcon = hasSuites ? <Layers size={16} /> : <Plus size={16} />;
  const mobileSuitesNavIcon = hasSuites ? <Layers size={17} /> : <Plus size={17} />;

  useEffect(() => {
    // Wait for Zustand to finish reading localStorage before redirecting
    if (_hasHydrated && !user) router.push("/login");
  }, [_hasHydrated, user, router]);

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    api.auth.me().then(setUser).catch(() => undefined);
    api.suites.list().then(setSuites).catch(() => setSuites([]));
  }, [_hasHydrated, user?.id, setUser]);

  // Show spinner while auth state is loading from localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (user.approval_status === "frozen" && !user.is_super_admin) {
    return <FrozenScreen />;
  }
  if (user.approval_status === "funnel" && !user.is_super_admin) {
    return <FunnelChrome>{children}</FunnelChrome>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-card/40 flex-col p-4 shrink-0">
        <div className="mb-8 px-2"><BrandMark size="sm" /></div>
        <nav className="flex-1 space-y-1">
          <div className="px-3 pb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Account</div>
          <SideLink href="/suites" icon={<LayoutDashboard size={16} />} label={t("nav.dashboard")} active={!hasSuites && pathname === "/suites"} />
          <SideLink href="/create" icon={<Sparkles size={16} />} label={t("nav.create")} active={pathname === "/create"} />
          <SideLink href={suitesNavHref} icon={suitesNavIcon} label={suitesNavLabel} active={suitesNavActive} />
          {user.is_super_admin && <SideLink href="/admin" icon={<ShieldCheck size={16} />} label="Admin" active={pathname === "/admin"} />}
          <SideLink href="/settings" icon={<Settings size={16} />} label={t("nav.settings")} active={pathname === "/settings"} />
          {activeSuiteId && <SuiteNav suiteId={activeSuiteId} />}
        </nav>
        <div className="border-t border-border pt-4 mt-4">
          <div className="text-sm text-muted-foreground px-2 mb-2 truncate">{user.email}</div>
          <LanguageSwitcher placement="top" />
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
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="md:hidden sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/suites" className="text-foreground font-semibold"><BrandMark size="sm" /></Link>
            <div className="flex items-center gap-1">
              <ThemeSwitcher compact />
              {activeSuiteId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSuiteOpen((value) => !value)}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  aria-label={mobileSuiteOpen ? "Close Current Suite navigation" : "Open Current Suite navigation"}
                  aria-expanded={mobileSuiteOpen}
                >
                  {mobileSuiteOpen ? <X size={17} /> : <Menu size={17} />}
                </Button>
              )}
              <IconLink href="/suites" icon={<LayoutDashboard size={17} />} active={!hasSuites && pathname === "/suites"} />
              <IconLink href="/create" icon={<Sparkles size={17} />} active={pathname === "/create"} />
              <IconLink href={suitesNavHref} icon={mobileSuitesNavIcon} active={suitesNavActive} />
              {user.is_super_admin && <IconLink href="/admin" icon={<ShieldCheck size={17} />} active={pathname === "/admin"} />}
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
          {activeSuiteId && mobileSuiteOpen && (
            <div className="mt-3 rounded-xl border border-border bg-card p-3 shadow-lg">
              <div className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Account</div>
              <div className="mb-2 grid grid-cols-3 gap-1">
                <MobileScopeLink href="/suites" label="Suites" active={pathname === "/suites"} />
                <MobileScopeLink href="/create" label={t("nav.create")} active={pathname === "/create"} />
                <MobileScopeLink href={suitesNavHref} label={suitesNavLabel} active={suitesNavActive} />
              </div>
              <SuiteNav suiteId={activeSuiteId} onNavigate={() => setMobileSuiteOpen(false)} />
            </div>
          )}
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
      className={`flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "os-nav-active" : "os-nav-link"
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
        active ? "os-nav-active" : "os-nav-link"
      }`}
    >
      {icon}
    </Link>
  );
}

function MobileScopeLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2 py-2 text-center text-xs transition-colors ${
        active ? "os-nav-active" : "os-nav-link"
      }`}
    >
      {label}
    </Link>
  );
}
