"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnalyticsTab, CampaignsHub } from "@/components/suite/SuiteLegacyDashboard";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { api, AnalyticsData, Connections, InsightPoint } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BarChart3, Link2, Loader2, RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageContext";

type AnalyticsState = "loading" | "no_connections" | "needs_attention" | "no_data" | "ready";

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
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
      setError(e instanceof Error ? e.message : t("suite.analytics.statusUnavailable"));
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

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
    <SuitePageShell title={t("suite.analytics.title")} description={t("suite.analytics.description")}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {loading ? t("suite.analytics.checking") : analyticsStateLabel(state, t)}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {t("suite.connections.refresh")}
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
            <p className="mt-3 text-sm font-medium text-foreground">{t("suite.analytics.waitingTitle")}</p>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
              {t("suite.analytics.waitingDesc")}
            </p>
          </div>
        )}
      </div>
    </SuitePageShell>
  );
}

function AnalyticsNotice({ state, suiteId, errors }: { state: AnalyticsState; suiteId: string; errors: string[] }) {
  const t = useT();
  if (state === "loading") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        {t("suite.analytics.loadingReadiness")}
      </div>
    );
  }

  if (state === "no_connections") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <Link2 size={18} className="mt-0.5 text-amber-700 dark:text-amber-200" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{t("suite.analytics.needsProviderTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("suite.analytics.needsProviderDesc")}
            </p>
          </div>
          <Link
            href={`/suite/${suiteId}/connections`}
            className="inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted hover:text-foreground"
          >
            {t("suite.analytics.openConnections")}
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
            <p className="text-sm font-medium text-foreground">{t("suite.analytics.needsAttentionTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("suite.analytics.needsAttentionDesc")}
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
      <p className="text-sm font-medium text-foreground">{t("suite.analytics.noDataTitle")}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("suite.analytics.noDataDesc")}
      </p>
    </div>
  );
}

function analyticsStateLabel(state: AnalyticsState, t: (key: string) => string) {
  return {
    loading: t("suite.analytics.checking"),
    no_connections: t("suite.analytics.noProvider"),
    needs_attention: t("suite.analytics.providerAttention"),
    no_data: t("suite.analytics.noMetrics"),
    ready: t("suite.analytics.ready"),
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
