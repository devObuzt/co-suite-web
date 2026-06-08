"use client";

import { use, useCallback, useEffect, useState, type ReactNode } from "react";
import { ConnectionsPanel } from "@/components/suite/SuiteLegacyDashboard";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { api, Connections, StorageStatus } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Cloud, Link2, Loader2, RefreshCw, Share2 } from "lucide-react";

type Readiness = "connected" | "not_connected" | "needs_attention" | "unavailable";

export default function ConnectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [connections, setConnections] = useState<Connections>({});
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextConnections, nextStorage] = await Promise.all([
        api.connections.get(id),
        api.suites.storageStatus(id).catch(() => null),
      ]);
      setConnections(nextConnections);
      setStorage(nextStorage);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection status is unavailable");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metaItems = [
    { label: "Facebook page", value: connections.facebook?.page_name, ready: !!connections.facebook?.connected },
    { label: "Instagram account", value: connections.instagram?.username ? `@${connections.instagram.username}` : "", ready: !!connections.instagram?.connected },
    { label: "Meta Ads", value: connections.meta_ads?.ad_account_name || connections.meta_ads?.ad_account_id, ready: !!connections.meta_ads?.connected },
  ];
  const metaReadyCount = metaItems.filter((item) => item.ready).length;
  const metaStatus: Readiness = metaReadyCount === metaItems.length
    ? "connected"
    : metaReadyCount > 0
      ? "needs_attention"
      : "not_connected";
  const googleStatus: Readiness = connections.google_ads?.connected ? "connected" : "not_connected";
  const storageStatus: Readiness = !storage
    ? "unavailable"
    : storage.configured && storage.public
      ? "connected"
      : "needs_attention";

  return (
    <SuitePageShell title="Connections" description="Provider readiness for publishing, analytics, campaigns, and durable media storage.">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {loading ? "Checking provider status..." : "Current Suite connection state"}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" dir="auto">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <StatusCard
            icon={<Share2 size={16} />}
            title="Meta"
            status={metaStatus}
            detail={metaStatus === "connected" ? "Facebook, Instagram, and Meta Ads are ready." : "Connect or complete Meta setup for publishing, campaigns, and analytics."}
            rows={metaItems.map((item) => ({ label: item.label, value: item.ready ? item.value || "Connected" : "Not connected", ready: item.ready }))}
          />
          <StatusCard
            icon={<BarChart3 size={16} />}
            title="Google Ads"
            status={googleStatus}
            detail={googleStatus === "connected" ? "Google Ads campaign read access is configured." : "Connect Google Ads before campaign analytics can load."}
            rows={[{
              label: "Ads account",
              value: connections.google_ads?.customer_name || connections.google_ads?.customer_id || "Not connected",
              ready: !!connections.google_ads?.connected,
            }]}
          />
          <StatusCard
            icon={<Cloud size={16} />}
            title="Media Storage"
            status={storageStatus}
            detail={storageStatus === "connected" ? "Durable public media storage is ready." : "Generated images/videos may be local-only until storage config is complete."}
            rows={[
              { label: "Backend", value: storage?.backend || "Unknown", ready: !!storage },
              { label: "Public URLs", value: storage?.public ? "Configured" : "Needs attention", ready: !!storage?.public },
              ...(storage?.missing || []).slice(0, 4).map((name) => ({ label: "Missing config", value: name, ready: false })),
            ]}
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Missing configuration names are shown for diagnostics. Secret values are never displayed.
        </div>

        <ConnectionsPanel suiteId={id} />
      </div>
    </SuitePageShell>
  );
}

function StatusCard({
  icon,
  title,
  status,
  detail,
  rows,
}: {
  icon: ReactNode;
  title: string;
  status: Readiness;
  detail: string;
  rows: Array<{ label: string; value: string; ready: boolean }>;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </div>
        <ReadinessBadge status={status} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      <div className="mt-4 space-y-2">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">{row.label}</span>
            <span className={`min-w-0 truncate text-right ${row.ready ? "text-foreground" : "text-amber-700 dark:text-amber-300"}`} dir="auto">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadinessBadge({ status }: { status: Readiness }) {
  const label = {
    connected: "Connected",
    not_connected: "Not connected",
    needs_attention: "Needs attention",
    unavailable: "Unavailable",
  }[status];
  const className = {
    connected: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    not_connected: "border-muted-foreground/30 text-muted-foreground",
    needs_attention: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200",
    unavailable: "border-destructive/30 bg-destructive/10 text-destructive",
  }[status];
  return (
    <Badge variant="outline" className={className}>
      <Link2 size={11} className="mr-1" />
      {label}
    </Badge>
  );
}
