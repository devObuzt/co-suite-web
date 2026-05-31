"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CircleGauge,
  GalleryHorizontalEnd,
  Globe2,
  LayoutDashboard,
  Link2,
  Megaphone,
  PackageOpen,
  Sparkles,
  UserSquare2,
} from "lucide-react";
import { api, Connections, StorageStatus, Suite } from "@/lib/api";

export function SuiteNav({ suiteId }: { suiteId: string }) {
  const pathname = usePathname();
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
    { href: base, label: "الرئيسية", icon: CircleGauge },
    { href: `${base}/dashboard`, label: "لوحة السوت", icon: LayoutDashboard },
    { href: `${base}/connections`, label: "Connections", icon: Link2, status: "connections" },
    { href: `${base}/create`, label: "Create & Generate", icon: Sparkles },
    { href: `${base}/content`, label: "المحتوى", icon: GalleryHorizontalEnd },
    { href: `${base}/analytics`, label: "معطيات وتحليل", icon: BarChart3 },
    { href: `${base}/profile`, label: "العلامة والبروفايل", icon: UserSquare2 },
    { href: `${base}/market`, label: "المنافسين والسوق", icon: Globe2 },
    { href: `${base}/calendar`, label: "Social Calendar", icon: CalendarDays },
    { href: `${base}/campaigns`, label: "Campaign Builder", icon: Megaphone },
    { href: `${base}/product-bulk`, label: "Product Bulk", icon: PackageOpen },
  ], [base]);

  const dots = {
    meta: Boolean(connections.facebook?.connected || connections.instagram?.connected),
    google: Boolean(connections.google_ads?.connected),
    storage: Boolean(storage?.configured),
  };

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="px-3 pb-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current suite</p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground" dir="auto">
          {suite?.name || "Suite"}
        </p>
      </div>
      <nav className="space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon size={15} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.status === "connections" && (
                <span className="flex items-center gap-1" aria-label="Connection status">
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
