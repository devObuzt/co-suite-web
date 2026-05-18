"use client";
import { use, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/LanguageContext";
import Image from "next/image";
import Link from "next/link";
import { api, Suite, Post, Connections, AnalyticsData, InsightPoint, MarketingStrategy, AudiencePersona, CompetitorEntry } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Zap, BarChart3, Calendar, Settings, Globe, AtSign, Share2,
  Loader2, CheckCircle2, XCircle, RefreshCw, Hash, ImageIcon, LayoutList, Video,
  Link2, Link2Off, CreditCard, Target,
} from "lucide-react";

const API_MEDIA = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8000";

export default function SuiteDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const [suite, setSuite] = useState<Suite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.suites.get(id).then(setSuite).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-zinc-400">Loading…</div>;
  if (!suite) return <div className="p-8 text-red-400">Suite not found</div>;

  const brand = suite.brand;
  const primaryColor = brand?.colors?.primary || "#4f46e5";

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: primaryColor }}
          >
            {suite.name[0].toUpperCase()}
          </div>
          <div>
            <Link href={`/suite/${id}/profile`} className="group flex items-center gap-2 hover:text-indigo-300 transition-colors">
              <h1 className="text-2xl font-bold text-white">{suite.name}</h1>
              <span className="text-zinc-600 text-xs group-hover:text-indigo-400 transition-colors">→ Profile</span>
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 border text-xs" variant="outline">
                {suite.status}
              </Badge>
              {brand?.industry && <span className="text-zinc-500 text-sm">{brand.industry}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/suite/${id}/billing`}>
            <Button variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-400 hover:text-white gap-2">
              <CreditCard size={14} /> Billing
            </Button>
          </Link>
          <Button variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-400 hover:text-white gap-2">
            <Settings size={14} /> Settings
          </Button>
        </div>
      </div>

      {/* Connections */}
      <ConnectionsPanel suiteId={id} />
      <CompetitorsSection suiteId={id} strategy={suite?.strategy ?? null} />

      {/* Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="content" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">
            <Zap size={14} className="mr-1.5" /> {t("tab.content")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">
            <BarChart3 size={14} className="mr-1.5" /> {t("tab.analytics")}
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">
            <Calendar size={14} className="mr-1.5" /> {t("tab.schedule")}
          </TabsTrigger>
          <TabsTrigger value="strategy" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">
            <Target size={14} className="mr-1.5" /> {t("tab.strategy")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <ContentTab suiteId={id} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab suiteId={id} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center">
            <Calendar size={32} className="text-indigo-400 mx-auto mb-3" />
            <p className="text-white font-medium">Content calendar</p>
            <p className="text-zinc-400 text-sm mt-1">Scheduled posts will appear here</p>
          </div>
        </TabsContent>

        <TabsContent value="strategy" className="mt-4">
          <StrategyPanel strategy={suite?.strategy ?? null} suiteId={id} brand={suite?.brand ?? null} onRegenerate={async () => {
            try {
              const res = await api.onboarding.generateStrategy({ suite_id: id });
              setSuite((s) => s ? { ...s, strategy: res.strategy } : s);
            } catch (err: unknown) {
              alert(err instanceof Error ? err.message : "Regeneration failed");
            }
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Content Tab ────────────────────────────────────────────────────────────

function ContentTab({ suiteId }: { suiteId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "published">("pending");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    const data = await api.content.list(suiteId, filter);
    setPosts(data);
  };

  useEffect(() => {
    load();
  }, [suiteId, filter]);

  // Poll every 4 s while generating
  useEffect(() => {
    if (generating) {
      pollRef.current = setInterval(load, 4000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [generating, filter]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await api.content.generate(suiteId);
      // poll will pick up new posts; stop after 90s
      setTimeout(() => setGenerating(false), 90_000);
    } catch {
      setGenerating(false);
    }
  }

  async function handleApprove(postId: string) {
    await api.content.approve(suiteId, postId);
    await load();
  }

  async function handleReject(postId: string) {
    await api.content.reject(suiteId, postId);
    await load();
  }

  async function handleRegenerate(postId: string) {
    await api.content.regenerate(suiteId, postId);
    setPosts((p) => p.filter((x) => x.id !== postId));
    setGenerating(true);
    setTimeout(() => setGenerating(false), 90_000);
  }

  const filtered = posts.filter((p) => p.status === filter);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
          {(["pending", "approved", "published", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                filter === f ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-500 gap-2"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {generating ? "Generating…" : "Generate 3 posts"}
        </Button>
      </div>

      {generating && (
        <div className="flex items-center gap-2 text-sm text-indigo-400 bg-indigo-950/40 border border-indigo-900 rounded-lg px-4 py-2.5">
          <Loader2 size={14} className="animate-spin" />
          AI is writing and generating images — this takes ~30 seconds…
        </div>
      )}

      {/* Post grid */}
      {filtered.length === 0 && !generating ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center">
          <Zap size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">
            {filter === "pending" ? "Click Generate 3 posts to create AI content" : `No ${filter} posts yet`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              suiteId={suiteId}
              onApprove={() => handleApprove(post.id)}
              onReject={() => handleReject(post.id)}
              onRegenerate={() => handleRegenerate(post.id)}
              onPublish={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────

function PostCard({
  post, suiteId, onApprove, onReject, onRegenerate, onPublish,
}: {
  post: Post;
  suiteId: string;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onPublish: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [publishResult, setPublishResult] = useState<Record<string, string> | null>(null);
  const [publishWarning, setPublishWarning] = useState("");
  const isPending = post.status === "pending";
  const isApproved = post.status === "approved";
  const isPublished = post.status === "published";
  const firstImage = post.media_urls?.[0];

  const fmt = post.format;
  const FormatIcon = fmt === "carousel" ? LayoutList : fmt === "video" ? Video : ImageIcon;

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function handlePublish() {
    setBusy(true);
    try {
      const res = await api.content.publish(suiteId, post.id);
      setPublishResult(res.results);
      if (res.results.warnings) setPublishWarning(res.results.warnings as unknown as string);
      await onPublish();
    } catch (e: unknown) {
      setPublishWarning(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 flex flex-col overflow-hidden">
      {/* Image preview */}
      <div className="relative bg-zinc-800 aspect-square w-full overflow-hidden">
        {firstImage ? (
          <Image
            src={`${API_MEDIA}${firstImage}`}
            alt={post.topic || "post"}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FormatIcon size={32} className="text-zinc-600" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge className="bg-zinc-900/80 text-zinc-300 border-zinc-700 text-xs gap-1" variant="outline">
            <FormatIcon size={10} /> {fmt}
          </Badge>
        </div>
        {post.media_urls && post.media_urls.length > 1 && (
          <div className="absolute top-2 right-2 bg-zinc-900/80 text-zinc-300 text-xs px-1.5 py-0.5 rounded">
            {post.media_urls.length} slides
          </div>
        )}
      </div>

      <CardContent className="flex-1 flex flex-col p-4 gap-3">
        {/* Caption */}
        <p className="text-zinc-200 text-sm leading-relaxed line-clamp-4" dir="auto">
          {post.caption || post.topic}
        </p>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <>
            <Separator className="bg-zinc-800" />
            <div className="flex flex-wrap gap-1">
              {post.hashtags.slice(0, 4).map((h: string) => (
                <span key={h} className="text-xs text-indigo-400 flex items-center gap-0.5">
                  <Hash size={9} />{h.replace(/^#/, "")}
                </span>
              ))}
              {post.hashtags.length > 4 && (
                <span className="text-xs text-zinc-600">+{post.hashtags.length - 4}</span>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2 mt-auto pt-1">
            <Button
              size="sm"
              onClick={() => act(onApprove)}
              disabled={busy}
              className="flex-1 bg-emerald-700 hover:bg-emerald-600 gap-1 text-xs h-8"
            >
              <CheckCircle2 size={12} /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => act(onReject)}
              disabled={busy}
              className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-900 gap-1 text-xs h-8"
            >
              <XCircle size={12} /> Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => act(onRegenerate)}
              disabled={busy}
              className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-1 text-xs h-8 px-2"
              title="Regenerate"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            </Button>
          </div>
        )}

        {/* Publish warning */}
        {publishWarning && (
          <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900 rounded px-2 py-1">{publishWarning}</p>
        )}

        {/* Approved — show Publish button */}
        {isApproved && (
          <div className="flex gap-2 mt-auto pt-1">
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={busy}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 gap-1 text-xs h-8"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
              Publish now
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => act(onReject)}
              disabled={busy}
              className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-900 gap-1 text-xs h-8"
            >
              <XCircle size={12} />
            </Button>
          </div>
        )}

        {!isPending && !isApproved && (
          <div className="flex items-center gap-2 mt-auto pt-1">
            <Badge
              variant="outline"
              className={`text-xs border ${
                isPublished
                  ? "border-indigo-800 text-indigo-400 bg-indigo-950"
                  : "border-red-900 text-red-400 bg-red-950"
              }`}
            >
              {post.status}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Connections Panel ───────────────────────────────────────────────────────

function ConnectionsPanel({ suiteId }: { suiteId: string }) {
  const [connections, setConnections] = useState<Connections>({});
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    api.connections.get(suiteId).then(setConnections).catch(() => {});
  }, [suiteId]);

  async function connectMeta() {
    setConnecting(true);
    try {
      const { url } = await api.connections.metaAuthUrl(suiteId);
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  async function disconnect(platform: string) {
    await api.connections.disconnect(suiteId, platform);
    const updated = await api.connections.get(suiteId);
    setConnections(updated);
  }

  const fb = connections.facebook;
  const ig = connections.instagram;
  const metaConnected = !!fb?.connected;

  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-400 mb-3">Connections</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Meta (Facebook + Instagram) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
              <Share2 size={15} className="text-blue-400" /> Facebook
            </div>
            <span className={`w-2 h-2 rounded-full ${metaConnected ? "bg-emerald-400" : "bg-zinc-600"}`} />
          </div>
          {metaConnected ? (
            <>
              <p className="text-zinc-400 text-xs">{fb?.page_name}</p>
              {ig?.connected && (
                <p className="text-zinc-400 text-xs flex items-center gap-1">
                  <AtSign size={11} /> @{ig.username}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => disconnect("facebook")}
                className="w-full border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-900 gap-1 text-xs h-7"
              >
                <Link2Off size={11} /> Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={connectMeta}
              disabled={connecting}
              className="w-full bg-blue-700 hover:bg-blue-600 gap-1 text-xs h-7"
            >
              {connecting ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
              Connect Facebook &amp; Instagram
            </Button>
          )}
        </div>

        {/* Website (future) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 opacity-50">
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
            <Globe size={15} /> Website
          </div>
          <p className="text-zinc-500 text-xs">WordPress integration coming soon</p>
        </div>

        {/* TikTok (future) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 opacity-50">
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
            <AtSign size={15} /> TikTok
          </div>
          <p className="text-zinc-500 text-xs">Coming soon</p>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function AnalyticsTab({ suiteId }: { suiteId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(28);

  async function load(d = days) {
    setLoading(true);
    try {
      const res = await api.analytics.get(suiteId, d);
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [suiteId]);

  if (loading) return (
    <div className="flex items-center gap-2 text-zinc-400 py-12 justify-center">
      <Loader2 size={18} className="animate-spin" /> Loading analytics…
    </div>
  );

  if (!data || data.error === "no_connections") return (
    <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center">
      <BarChart3 size={32} className="text-zinc-600 mx-auto mb-3" />
      <p className="text-white font-medium">No connected accounts</p>
      <p className="text-zinc-400 text-sm mt-1">Connect Facebook or Instagram above to see analytics</p>
    </div>
  );

  const fb = data.facebook || {};
  const ig = data.instagram || {};

  // Build unified reach chart from whichever platform has data
  const reachSeries: InsightPoint[] =
    ig.insights?.reach || fb.insights?.page_reach || [];
  const impressionSeries: InsightPoint[] =
    ig.insights?.impressions || fb.insights?.page_impressions || [];

  const chartData = reachSeries.map((pt, i) => ({
    date: pt.date.slice(5),   // MM-DD
    reach: pt.value,
    impressions: impressionSeries[i]?.value ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {[7, 28, 90].map((d) => (
          <button
            key={d}
            onClick={() => { setDays(d); load(d); }}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              days === d ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="FB Followers" value={fb.fans ?? fb.followers ?? 0} icon="👥" />
        <StatCard label="IG Followers" value={ig.followers ?? 0} icon="📷" icon2={ig.username ? `@${ig.username}` : undefined} />
        <StatCard
          label="Total Reach"
          value={sum(fb.insights?.page_reach) + sum(ig.insights?.reach)}
          icon="👁"
          sub={`last ${days}d`}
        />
        <StatCard
          label="Impressions"
          value={sum(fb.insights?.page_impressions) + sum(ig.insights?.impressions)}
          icon="📊"
          sub={`last ${days}d`}
        />
      </div>

      {/* Reach / Impressions chart */}
      {chartData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm text-zinc-400 mb-4">Reach &amp; Impressions — last {days} days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} width={45} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#e4e4e7" }}
              />
              <Line type="monotone" dataKey="reach" stroke="#6366f1" strokeWidth={2} dot={false} name="Reach" />
              <Line type="monotone" dataKey="impressions" stroke="#818cf8" strokeWidth={1.5} dot={false} name="Impressions" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent media grid */}
      {ig.recent_media && ig.recent_media.length > 0 && (
        <div>
          <h3 className="text-sm text-zinc-400 mb-3">Recent Instagram posts</h3>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {ig.recent_media.map((m) => (
              <a key={m.id} href={m.url || "#"} target="_blank" rel="noopener noreferrer"
                className="relative group rounded-lg overflow-hidden bg-zinc-800 aspect-square">
                {m.image && (
                  <img src={m.image} alt={m.caption} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <span className="text-white text-xs">❤️ {m.likes}</span>
                  <span className="text-white text-xs">💬 {m.comments}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recent FB posts */}
      {fb.recent_posts && fb.recent_posts.length > 0 && (
        <div>
          <h3 className="text-sm text-zinc-400 mb-3">Recent Facebook posts</h3>
          <div className="space-y-2">
            {fb.recent_posts.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                {p.image && (
                  <img src={p.image} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-sm line-clamp-1" dir="auto">{p.message || "(no caption)"}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {new Date(p.created_time).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="flex gap-3 text-xs text-zinc-400 shrink-0">
                  <span>❤️ {p.likes}</span>
                  <span>💬 {p.comments}</span>
                  <span>🔁 {p.shares}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, icon2, sub }: {
  label: string; value: number; icon: string; icon2?: string; sub?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-zinc-400 text-xs mt-0.5">{label}</div>
      {(icon2 || sub) && <div className="text-zinc-600 text-xs mt-0.5">{icon2 ?? sub}</div>}
    </div>
  );
}

function sum(series?: InsightPoint[]): number {
  return (series || []).reduce((acc, pt) => acc + pt.value, 0);
}

// ─── Competitors & Market Research ─────────────────────────────────────────

function CompetitorsSection({
  suiteId,
  strategy,
}: {
  suiteId: string;
  strategy: MarketingStrategy | null;
}) {
  const [results, setResults] = useState<import("@/lib/api").MarketResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.suites.marketResearch(suiteId);
      setResults(data.results);
      setLoaded(true);
    } catch {
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  const knownCompetitors = strategy?.marketing_plan?.competitors || [];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Globe size={14} className="text-indigo-400" /> Competitors & Market
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-1.5 h-7 text-xs"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Research market
        </Button>
      </div>

      {/* Known competitors from strategy */}
      {knownCompetitors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {knownCompetitors.map((c: CompetitorEntry) => (
            <a
              key={c.name}
              href={c.website || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:border-zinc-500 transition-colors"
            >
              <Globe size={11} className="text-zinc-500" />
              {c.name}
            </a>
          ))}
        </div>
      )}

      {/* Web search results */}
      {loaded && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {results.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-2 items-start bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 hover:border-zinc-500 transition-colors"
            >
              {r.platform === "instagram" && <AtSign size={13} className="text-pink-400 mt-0.5 shrink-0" />}
              {r.platform === "tiktok" && <Video size={13} className="text-zinc-400 mt-0.5 shrink-0" />}
              {r.platform === "facebook" && <Globe size={13} className="text-blue-500 mt-0.5 shrink-0" />}
              {r.platform === "web" && <Globe size={13} className="text-blue-400 mt-0.5 shrink-0" />}
              <div className="min-w-0">
                <p className="text-zinc-200 text-xs font-medium truncate" dir="auto">{r.title}</p>
                <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2" dir="auto">{r.snippet}</p>
              </div>
            </a>
          ))}
        </div>
      )}

      {loaded && results.length === 0 && (
        <p className="text-zinc-600 text-xs">No results found. Set up your audience location in the business profile to get better results.</p>
      )}
    </div>
  );
}

// ─── Strategy Panel ──────────────────────────────────────────────────────────

function StrategyPanel({
  strategy,
  suiteId: _suiteId,
  brand,
  onRegenerate,
}: {
  strategy: MarketingStrategy | null;
  suiteId: string;
  brand: import("@/lib/api").Brand | null;
  onRegenerate: () => Promise<void>;
}) {
  const [regenerating, setRegenerating] = useState(false);

  if (!strategy) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardContent className="py-12 text-center">
          <Target size={36} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No marketing strategy yet.</p>
          <p className="text-zinc-500 text-xs mt-1">Complete your suite setup to generate one.</p>
        </CardContent>
      </Card>
    );
  }

  const plan = strategy.marketing_plan;
  const audience = plan?.audience;

  return (
    <div className="space-y-4">
      {/* Business Profile */}
      {brand && (
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-normal">Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* A: Name */}
            {brand.name && (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Business name</p>
                  <p className="text-white text-sm" dir="auto">{brand.name}</p>
                </div>
              </div>
            )}
            {/* B: Category */}
            {(brand.niche || brand.industry) && (
              <div>
                <p className="text-zinc-500 text-xs mb-0.5">Category</p>
                <p className="text-white text-sm">{brand.niche || brand.industry}</p>
              </div>
            )}
            {/* C: Languages */}
            {(brand.audience_languages || []).length > 0 && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Audience languages</p>
                <div className="flex flex-wrap gap-1.5">
                  {(brand.audience_languages || []).map((code, idx) => (
                    <span key={code} className={`text-xs px-2 py-0.5 rounded-full border ${
                      idx === 0 ? "bg-indigo-950 border-indigo-800 text-indigo-300" : "border-zinc-700 text-zinc-400"
                    }`}>
                      {code === "ar" ? "العربية" : code === "he" ? "עברית" : code === "en" ? "English" : code === "fr" ? "Français" : code === "es" ? "Español" : code === "tr" ? "Türkçe" : code}
                      {idx === 0 && <span className="ml-1 text-indigo-500 text-xs">main</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* D: Services */}
            {(brand.services || []).length > 0 && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Services & Products</p>
                <div className="flex flex-wrap gap-1">
                  {(brand.services || []).slice(0, 6).map((s) => (
                    <span key={s} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700" dir="auto">{s}</span>
                  ))}
                  {(brand.services || []).length > 6 && (
                    <span className="text-xs text-zinc-500">+{(brand.services || []).length - 6} more</span>
                  )}
                </div>
              </div>
            )}
            {/* E: Audience location */}
            {brand.audience_location && (
              <div>
                <p className="text-zinc-500 text-xs mb-0.5">Target location</p>
                <p className="text-white text-sm">
                  {brand.audience_location.scope === "world"
                    ? "Worldwide"
                    : (brand.audience_location.countries || []).join(", ") || brand.location || "—"}
                </p>
                {(brand.audience_location.cities || []).length > 0 && (
                  <p className="text-zinc-400 text-xs mt-0.5">{(brand.audience_location.cities || []).join(", ")}</p>
                )}
              </div>
            )}
            {/* E: Interests */}
            {(brand.audience_interests || []).length > 0 && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Audience interests</p>
                <div className="flex flex-wrap gap-1">
                  {(brand.audience_interests || []).map((i) => (
                    <span key={i} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">{i}</span>
                  ))}
                </div>
              </div>
            )}
            {/* F: USP */}
            {(brand.usp_points || []).length > 0 && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Why choose us (USP)</p>
                <ul className="space-y-0.5">
                  {(brand.usp_points || []).map((p) => (
                    <li key={p} className="text-white text-sm flex items-start gap-1.5" dir="auto">
                      <span className="text-indigo-400 shrink-0">·</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* F: ESP */}
            {(brand.esp_points || []).length > 0 && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Client feels (ESP)</p>
                <ul className="space-y-0.5">
                  {(brand.esp_points || []).map((p) => (
                    <li key={p} className="text-white text-sm flex items-start gap-1.5" dir="auto">
                      <span className="text-indigo-400 shrink-0">·</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* G: Brand assets */}
            {(brand.logo_url || brand.colors?.primary) && (
              <div>
                <p className="text-zinc-500 text-xs mb-2">Brand assets</p>
                <div className="flex items-center gap-3">
                  {brand.logo_url && (
                    <img src={brand.logo_url} alt="logo" className="h-10 w-10 object-contain bg-zinc-800 rounded border border-zinc-700 p-1" />
                  )}
                  {brand.colors?.primary && (
                    <div className="flex gap-1.5">
                      {(["primary", "secondary", "accent"] as const).map((k) => brand.colors?.[k] && (
                        <div key={k} className="w-6 h-6 rounded border border-zinc-700"
                          style={{ backgroundColor: brand.colors?.[k] as string || "transparent" }}
                          title={k}
                        />
                      ))}
                    </div>
                  )}
                  {(brand.font_suggestions || []).length > 0 && (
                    <span className="text-xs text-zinc-400">{(brand.font_suggestions || [])[0]}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Marketing message */}
      <Card className="bg-indigo-950/40 border-indigo-800 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-indigo-300 font-medium">Marketing Message</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white text-sm leading-relaxed" dir="auto">{strategy.marketing_message}</p>
        </CardContent>
      </Card>

      {/* Audience overview */}
      {audience && (
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-normal">Target Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audience.problem && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Core problem we solve</p>
                <p className="text-white text-sm" dir="auto">{audience.problem}</p>
              </div>
            )}
            {audience.demographics && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(audience.demographics).map(([k, v]) => (
                  <div key={k} className="bg-zinc-800 rounded px-2 py-1.5">
                    <span className="text-zinc-500 capitalize">{k.replace("_", " ")}: </span>
                    <span className="text-zinc-300">{v as string}</span>
                  </div>
                ))}
              </div>
            )}
            {audience.facebook_interests?.length > 0 && (
              <div>
                <p className="text-zinc-500 text-xs mb-1.5">Meta Ads interests (copy-paste ready)</p>
                <div className="flex flex-wrap gap-1">
                  {audience.facebook_interests.map((i) => (
                    <span key={i} className="text-xs bg-blue-950/60 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">{i}</span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content themes */}
      {plan?.content_themes?.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-normal">Content Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {plan.content_themes.map((t) => (
                <Badge key={t} variant="outline" className="border-zinc-700 text-zinc-300 text-xs" dir="auto">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitors */}
      {plan?.competitors?.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-normal">Competitor Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.competitors.map((c: CompetitorEntry) => (
              <div key={c.name} className="border border-zinc-800 rounded-lg p-3 space-y-1">
                <p className="text-white text-sm font-medium">{c.name}</p>
                {c.website && <p className="text-indigo-400 text-xs">{c.website}</p>}
                {c.usp && <p className="text-zinc-400 text-xs"><span className="text-zinc-500">USP: </span>{c.usp}</p>}
                {c.esp && <p className="text-zinc-400 text-xs"><span className="text-zinc-500">ESP: </span>{c.esp}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Personas */}
      {audience?.personas?.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-normal">Customer Personas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["Name", "Age", "Profession", "Needs", "Challenges"].map((h) => (
                      <th key={h} className="pb-2 pr-4 text-zinc-500 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audience.personas.map((p: AudiencePersona) => (
                    <tr key={p.name} className="border-b border-zinc-900">
                      <td className="py-2 pr-4 text-white" dir="auto">{p.name}</td>
                      <td className="py-2 pr-4 text-zinc-300">{p.age}</td>
                      <td className="py-2 pr-4 text-zinc-300" dir="auto">{p.profession}</td>
                      <td className="py-2 pr-4 text-zinc-400" dir="auto">{p.needs}</td>
                      <td className="py-2 pr-4 text-zinc-400" dir="auto">{p.challenges}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regenerate */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-2"
          disabled={regenerating}
          onClick={async () => {
            setRegenerating(true);
            await onRegenerate();
            setRegenerating(false);
          }}
        >
          {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Regenerate strategy
        </Button>
      </div>
    </div>
  );
}
