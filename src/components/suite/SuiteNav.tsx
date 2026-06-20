"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CircleGauge,
  FileText,
  GalleryHorizontalEnd,
  Link2,
  PackageOpen,
  Sparkles,
  UserSquare2,
} from "lucide-react";
import { api, Connections, StorageStatus, Suite } from "@/lib/api";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";

export function SuiteNav({ suiteId, onNavigate }: { suiteId: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { dir } = useLanguage();
  const t = useT();
  const [suite, setSuite] = useState<Suite | null>(null);
  const [connections, setConnections] = useState<Connections>({});
  const [storage, setStorage] = useState<StorageStatus | null>(null);

  useEffect(() => {
    api.suites.get(suiteId).then(setSuite).catch(() => setSuite(null));
    api.connections.get(suiteId).then(setConnections).catch(() => setConnections({}));
    api.suites.storageStatus(suiteId).then(setStorage).catch(() => setStorage(null));
  }, [suiteId]);

  const base = `/suite/${suiteId}`;
  const links = useMemo(() => [
    { href: base, label: t("suite.nav.home"), icon: CircleGauge },
    { href: `${base}/connections`, label: t("suite.nav.connections"), icon: Link2, status: "connections" },
    { href: `${base}/profile`, label: t("suite.nav.profile"), icon: UserSquare2 },
    { href: `${base}/create`, label: t("suite.nav.create"), icon: Sparkles },
    { href: `${base}/content`, label: t("suite.nav.content"), icon: GalleryHorizontalEnd },
    { href: `${base}/analytics`, label: t("suite.nav.analytics"), icon: BarChart3 },
    { href: `${base}/marketing-plan`, label: suiteNavLabel(t("suite.nav.marketingPlan")), icon: FileText },
    { href: `${base}/product-bulk`, label: t("suite.nav.productBulk"), icon: PackageOpen },
  ], [base, t]);

  const dots = {
    meta: Boolean(connections.facebook?.connected || connections.instagram?.connected),
    google: Boolean(connections.google_ads?.connected),
    storage: Boolean(storage?.configured),
  };

  return (
    <div className="mt-6 border-t border-border pt-4" dir={dir}>
      <div className="px-3 pb-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("suite.current")}</p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground" dir="auto">
          {suite?.name || t("suite.fallbackName")}
        </p>
      </div>
      <nav className="space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          const active = item.href === base ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? "os-nav-active" : "os-nav-link"
              }`}
            >
              <Icon size={15} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.status === "connections" && (
                <span className="flex items-center gap-1" aria-label={t("suite.nav.connectionReadiness")}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dots.meta ? "bg-emerald-400" : "bg-muted"}`} title="Meta" />
                  <span className={`h-1.5 w-1.5 rounded-full ${dots.google ? "bg-emerald-400" : "bg-muted"}`} title="Google Ads" />
                  <span className={`h-1.5 w-1.5 rounded-full ${dots.storage ? "bg-emerald-400" : "bg-muted"}`} title="Storage" />
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function suiteNavLabel(value: string) {
  return value === "suite.nav.marketingPlan" ? "Marketing plan" : value;
}
