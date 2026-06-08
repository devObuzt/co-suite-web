"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnalyticsTab, CampaignsHub } from "@/components/suite/SuiteLegacyDashboard";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { api, AnalyticsData, Connections, InsightPoint } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BarChart3, Link2, Loader2, RefreshCw } from "lucide-react";

type AnalyticsState = "loading" | "no_connections" | "needs_attention" | "no_data" | "ready";

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [connections, setConnections] = useState<Connections>({});
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextConnections = await api.connections.get(id).catch(() => ({}));
      setConnections(nextConnections);
      if (hasAnalyticsConnection(nextConnections)) {
        const nextAnalytics = await api.analytics.get(id);
        setAnalytics(nextAnalytics);
      } else {
        setAnalytics(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analytics status is unavailable");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const state: AnalyticsState = useMemo(() => {
    if (loading) return "loading";
    if (!hasAnalyticsConnection(connections) || analytics?.error === "no_connections") return "no_connections";
    if (error || (analytics?.errors || []).length > 0) return "needs_attention";
    if (!analyticsHasData(analytics)) return "no_data";
    return "ready";
  }, [analytics, connections, error, loading]);

  return (
    <SuitePageShell title="Analytics" description="Read-only campaign and channel performance, shown only when providers return usable data.">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {loading ? "Checking analytics prerequisites..." : analyticsStateLabel(state)}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </Button>
        </div>

        {state !== "ready" && (
          <AnalyticsNotice
            state={state}
            suiteId={id}
            errors={[error, ...(analytics?.errors || [])].filter(Boolean)}
          />
        )}

        <CampaignsHub suiteId={id} />

        {state === "ready" ? (
          <AnalyticsTab suiteId={id} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <BarChart3 size={30} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">Metric dashboard is waiting for provider data</p>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
              This avoids showing an all-zero dashboard when the true state is missing connection, missing permission, provider error, or no returned metrics.
            </p>
          </div>
        )}
      </div>
    </SuitePageShell>
  );
}

function AnalyticsNotice({ state, suiteId, errors }: { state: AnalyticsState; suiteId: string; errors: string[] }) {
  if (state === "loading") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Loading analytics readiness...
      </div>
    );
  }

  if (state === "no_connections") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <Link2 size={18} className="mt-0.5 text-amber-700 dark:text-amber-200" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Analytics needs a connected provider</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect Meta or Google Ads before analytics can show real campaign or channel data.
            </p>
          </div>
          <Link
            href={`/suite/${suiteId}/connections`}
            className="inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted hover:text-foreground"
          >
            Open Connections
          </Link>
        </div>
      </div>
    );
  }

  if (state === "needs_attention") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 text-amber-700 dark:text-amber-200" />
          <div>
            <p className="text-sm font-medium text-foreground">Analytics needs attention</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Provider permissions, account access, or API availability prevented a trustworthy dashboard.
            </p>
            {errors.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-100">
                {errors.slice(0, 3).map((item, index) => <p key={index} dir="auto">{item}</p>)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">No analytics data returned yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        The provider connection exists, but no insights, campaigns, posts, or media metrics were returned for the selected period.
      </p>
    </div>
  );
}

function analyticsStateLabel(state: AnalyticsState) {
  return {
    loading: "Checking analytics prerequisites...",
    no_connections: "No analytics provider connected",
    needs_attention: "Analytics provider needs attention",
    no_data: "Connected, but no metrics returned",
    ready: "Analytics data is available",
  }[state];
}

function hasAnalyticsConnection(connections: Connections) {
  return Boolean(
    connections.facebook?.connected ||
    connections.instagram?.connected ||
    connections.meta_ads?.connected ||
    connections.google_ads?.connected
  );
}

function analyticsHasData(data: AnalyticsData | null) {
  if (!data || data.error) return false;
  const fb = data.facebook;
  const ig = data.instagram;
  return Boolean(
    fb?.fans ||
    fb?.followers ||
    ig?.followers ||
    ig?.media_count ||
    hasPoints(fb?.insights?.page_impressions) ||
    hasPoints(fb?.insights?.page_impressions_unique) ||
    hasPoints(fb?.insights?.page_reach) ||
    hasPoints(fb?.insights?.page_post_engagements) ||
    hasPoints(ig?.insights?.reach) ||
    hasPoints(ig?.insights?.views) ||
    hasPoints(ig?.insights?.impressions) ||
    (fb?.recent_posts || []).length > 0 ||
    (ig?.recent_media || []).length > 0
  );
}

function hasPoints(points?: InsightPoint[]) {
  return (points || []).some((point) => Number(point.value) > 0);
}
