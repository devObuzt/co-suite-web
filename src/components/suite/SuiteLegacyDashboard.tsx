"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, Suite, Post, Connections, AnalyticsData, InsightPoint, MarketingStrategy, AudiencePersona, CompetitorEntry, MetaAd, MetaCampaign, GoogleAdsCampaign, GenerateContentRequest, GenerationStatus, StorageStatus, StorageTestResult, paymentGateDetail, PaymentGateDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Zap, BarChart3, Calendar, Settings, Globe, AtSign, Share2,
  Loader2, CheckCircle2, XCircle, RefreshCw, Hash, ImageIcon, LayoutList, Video,
  Link2, Link2Off, CreditCard, Target, ChevronDown, Layers, Wand2, SlidersHorizontal,
  Clock3, Megaphone, Sparkles, Copy, Download, Pencil, PackageOpen,
  HelpCircle, Palette, UploadCloud, Plus, X,
} from "lucide-react";

const API_MEDIA = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8000";

export function SuiteLegacyDashboard({ suiteId }: { suiteId: string }) {
  const id = suiteId;
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
    <div className="px-4 py-5 md:p-8 max-w-5xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
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
      <ContentTab suiteId={id} />
      <CompetitorsSection suiteId={id} strategy={suite?.strategy ?? null} />
      <MetaAdsInspirationSection suiteId={id} />
      <CampaignsHub suiteId={id} />
      <AnalyticsTab suiteId={id} />
      <StrategyPanel strategy={suite?.strategy ?? null} suiteId={id} brand={suite?.brand ?? null} onRegenerate={async () => {
        try {
          const res = await api.onboarding.generateStrategy({ suite_id: id });
          setSuite((s) => s ? { ...s, strategy: res.strategy } : s);
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : "Regeneration failed");
        }
      }} />
    </div>
  );
}

// ─── Content Tab ────────────────────────────────────────────────────────────

function isGenerationActive(status?: GenerationStatus | null) {
  return [
    "queued",
    "waiting_capacity",
    "waiting_provider_limit",
    "running",
    "retrying",
  ].includes(status?.status || "");
}

type ContentStatusFilter = "all" | "pending" | "approved" | "rejected" | "published";

function jobStatusTone(status?: string) {
  if (!status || status === "idle") return "border-border bg-muted/40 text-muted-foreground";
  if (["completed"].includes(status)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["failed", "cancelled", "timeout"].includes(status)) return "border-destructive/40 bg-destructive/10 text-destructive";
  if (["waiting_capacity", "waiting_provider_limit", "retrying"].includes(status)) return "os-warning-panel";
  return "border-blue-500/30 bg-blue-500/10 text-[color:var(--brand-accent-strong)] dark:text-blue-300";
}

function jobStatusLabel(status?: string) {
  switch (status) {
    case "queued": return "Queued";
    case "running": return "Running";
    case "waiting_capacity": return "Waiting";
    case "waiting_provider_limit": return "Waiting for provider";
    case "retrying": return "Retrying";
    case "completed": return "Completed";
    case "failed": return "Failed";
    case "cancelled": return "Cancelled";
    case "timeout": return "Timed out";
    default: return "Idle";
  }
}

function jobStatusMessage(status?: GenerationStatus | null) {
  if (!status) return "";
  if (status.status === "waiting_provider_limit") {
    return `Waiting for ${status.provider || "AI provider"} capacity${
      status.estimated_wait_seconds ? ` (~${Math.ceil(status.estimated_wait_seconds / 60)} min)` : ""
    }. You can leave this page.`;
  }
  if (status.status === "queued") return status.message || "Your request is queued and will start shortly.";
  if (status.status === "running") return status.message || "AI is generating content.";
  if (status.status === "retrying") return status.message || "The provider failed once; retry is scheduled.";
  if (status.status === "completed") return status.message || "Generation completed.";
  if (status.status === "failed") return status.error || status.message || "Generation failed.";
  if (status.status === "timeout") return status.error || status.message || "Generation timed out before completing.";
  if (status.status === "cancelled") return status.message || "Generation was cancelled.";
  return status.message || "";
}

function isRecentTerminalGenerationStatus(status?: GenerationStatus | null) {
  if (!status || !status.is_terminal) return false;
  if (status.status === "completed") return false;
  const timestamp = status.finished_at || status.updated_at || status.created_at;
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time < 15 * 60 * 1000;
}

export function ContentTab({ suiteId }: { suiteId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [generationError, setGenerationError] = useState("");
  const [paymentGate, setPaymentGate] = useState<PaymentGateDetail | null>(null);
  const [filter, setFilter] = useState<ContentStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "image" | "video" | "carousel" | "set" | "bulk" | "campaign">("all");
  const [showAllPosts, setShowAllPosts] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const data = await api.content.list(suiteId, filter === "all" ? undefined : filter);
    setPosts(data);
  }, [suiteId, filter]);

  const syncGenerationStatus = useCallback(async () => {
    const status = await api.content.generationStatus(suiteId);
    setGenerationStatus(status);
    const active = isGenerationActive(status);
    setGenerating(active);
    return status;
  }, [suiteId]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const [data, status] = await Promise.all([
          api.content.list(suiteId, filter === "all" ? undefined : filter),
          api.content.generationStatus(suiteId),
        ]);
        if (cancelled) return;
        setPosts(data);
        setGenerationStatus(status);
        setGenerating(isGenerationActive(status));
      } catch {
        if (!cancelled) setGenerating(false);
      }
    }
    void refresh();
    return () => {
      cancelled = true;
    };
  }, [suiteId, filter]);

  // Poll status and posts while the backend job is active.
  useEffect(() => {
    if (generating) {
      pollRef.current = setInterval(async () => {
        await load();
        const status = await syncGenerationStatus();
        if (status.status === "completed" || status.status === "failed" || status.status === "idle") {
          await load();
        }
      }, 3000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [generating, filter, load, syncGenerationStatus]);

  async function handleGenerate(request: GenerateContentRequest) {
    setGenerating(true);
    setGenerationError("");
    setPaymentGate(null);
    try {
      const status = await api.content.generate(suiteId, request);
      setGenerationStatus(status);
      setGenerating(isGenerationActive(status));
    } catch (e: unknown) {
      setGenerating(false);
      const gate = paymentGateDetail(e);
      if (gate) {
        setPaymentGate(gate);
        setGenerationError(gate.message || "Generation tokens are exhausted.");
        return;
      }
      setGenerationError(e instanceof Error ? e.message : "Content generation request failed");
    }
  }

  async function handleApprove(postId: string) {
    await api.content.approve(suiteId, postId);
    setPosts((current) => current.map((post) => (
      post.id === postId ? { ...post, status: "approved" } : post
    )));
    setFilter("approved");
  }

  async function handleReject(postId: string, reason: string) {
    await api.content.reject(suiteId, postId, reason);
    await load();
  }

  async function handleRegenerate(postId: string, feedback?: string) {
    const status = await api.content.regenerate(suiteId, postId, feedback);
    setGenerationStatus(status);
    setPosts((current) => current.map((post) => {
      if (post.id !== postId) return post;
      const metadata = post.ai_metadata || {};
      return {
        ...post,
        ai_metadata: {
          ...metadata,
          regeneration_requested: {
            feedback: feedback?.trim() || "",
            requested_at: new Date().toISOString(),
          },
        },
      };
    }));
    setGenerating(isGenerationActive(status));
  }

  const typeMatches = (post: Post) => {
    if (typeFilter === "all") return true;
    const metadata = post.ai_metadata || {};
    const generationMode = typeof metadata.generation_mode === "string" ? metadata.generation_mode : "";
    const contentType = typeof metadata.content_type === "string" ? metadata.content_type : "";
    if (typeFilter === "post") return post.format === "image" || contentType === "post";
    if (typeFilter === "set") return generationMode === "set";
    if (typeFilter === "bulk") return generationMode === "product_bulk" || generationMode === "bulk";
    if (typeFilter === "campaign") return generationMode === "campaign";
    return post.format === typeFilter || contentType === typeFilter;
  };

  const filtered = [...posts]
    .filter((p) => filter === "all" || p.status === filter)
    .filter(typeMatches)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const visiblePosts = showAllPosts ? filtered : filtered.slice(0, 3);
  const hiddenPostCount = Math.max(0, filtered.length - visiblePosts.length);
  const generationMessage = jobStatusMessage(generationStatus);
  const generationVisible = generationStatus && generationStatus.status !== "idle" && (generating || isGenerationActive(generationStatus) || isRecentTerminalGenerationStatus(generationStatus));

  return (
    <section className="space-y-4">
      <CreationProductCards suiteId={suiteId} />

      <CreateCommandCenter suiteId={suiteId} onGenerate={handleGenerate} generating={generating} generationStatus={generationStatus} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Recent content</h2>
          <p className="mt-1 text-xs text-muted-foreground">Review, approve, schedule, or publish generated work.</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex max-w-full gap-1 os-scroll-x rounded-lg border border-border bg-card p-1">
            {(["all", "post", "image", "video", "carousel", "set", "bulk", "campaign"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setTypeFilter(f);
                  setShowAllPosts(false);
                }}
                className={`shrink-0 px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                  typeFilter === f ? "bg-[color:var(--brand-accent)] text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex max-w-full gap-1 os-scroll-x rounded-lg border border-border bg-card p-1">
            {(["all", "pending", "approved", "rejected", "published"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setShowAllPosts(false);
                }}
                className={`shrink-0 px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                  filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {generationVisible && (
        <div
          className={`space-y-2 rounded-lg border px-4 py-3 text-sm ${jobStatusTone(generationStatus.status)}`}
          aria-live={generating ? "polite" : "off"}
        >
          <div className="flex flex-wrap items-center gap-2">
            {generating ? <Loader2 size={14} className="animate-spin" /> : generationStatus.status === "completed" ? <CheckCircle2 size={14} /> : generationStatus.status === "failed" ? <XCircle size={14} /> : <Clock3 size={14} />}
            <span className="font-medium">{jobStatusLabel(generationStatus.status)}</span>
            {generationStatus.stage && <span className="text-xs opacity-80">Stage: {generationStatus.stage}</span>}
            {generationStatus.provider && <span className="text-xs opacity-80">Provider: {generationStatus.provider}</span>}
          </div>
          <div>{generationMessage}</div>
          {(generating || typeof generationStatus.progress === "number") && (
            <div className="os-progress-track h-1.5 overflow-hidden rounded-full">
              <div
                className="os-progress-fill h-full rounded-full transition-all"
                style={{ width: `${Math.max(5, Math.min(100, generationStatus.progress || (generating ? 10 : 100)))}%` }}
              />
            </div>
          )}
          {(generationStatus.retry_count || generationStatus.next_retry_at || generationStatus.rate_limit_reset_at) && (
            <div className="text-xs opacity-80">
              {generationStatus.retry_count ? `Retry ${generationStatus.retry_count}. ` : ""}
              {generationStatus.next_retry_at ? `Next retry ${new Date(generationStatus.next_retry_at).toLocaleTimeString()}. ` : ""}
              {generationStatus.rate_limit_reset_at ? `Rate limit resets ${new Date(generationStatus.rate_limit_reset_at).toLocaleTimeString()}.` : ""}
            </div>
          )}
        </div>
      )}

      {generationError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <XCircle size={15} className="mt-0.5 shrink-0" />
          <div className="space-y-2">
            <span dir="auto">{generationError}</span>
            {paymentGate && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-red-100/80">
                  Required {paymentGate.required_tokens ?? 0} tokens, available {paymentGate.token_balance ?? 0}.
                </span>
                <Link href={`/suite/${suiteId}/billing`}>
                  <Button size="sm" variant="outline" className="h-8">
                    Upgrade or buy tokens
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post grid */}
      {filtered.length === 0 && !generating ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Zap size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "Create content above to fill this review queue." : `No ${filter} content yet`}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                suiteId={suiteId}
                onApprove={() => handleApprove(post.id)}
                onReject={(reason) => handleReject(post.id, reason)}
                onRegenerate={(feedback) => handleRegenerate(post.id, feedback)}
                onPublish={load}
              />
            ))}
          </div>
          {hiddenPostCount > 0 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setShowAllPosts(true)}
                className="border-border"
              >
                Show more ({hiddenPostCount})
              </Button>
            </div>
          )}
        </>
      )}

    </section>
  );
}

function CreationProductCards({ suiteId }: { suiteId: string }) {
  const cards = [
    { title: "Social Content Builder", description: "Build a recurring social plan, cadence, and content mix.", href: `/suite/${suiteId}/loops`, icon: Calendar, tone: "os-product-card-blue" },
    { title: "Campaign Builder", description: "Plan sponsored campaigns for Meta and Google Ads.", href: `/suite/${suiteId}`, icon: Megaphone, tone: "os-product-card-pink" },
    { title: "Content Set", description: "Generate a coordinated batch from one strategic prompt.", href: `#create`, icon: Layers, tone: "os-product-card-yellow" },
    { title: "Product Bulk Studio", description: "Excel + ZIP production for product catalogs.", href: `/suite/${suiteId}/product-bulk`, icon: PackageOpen, tone: "os-product-card-blue" },
  ];
  return (
    <div className="max-h-[20vh] overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible sm:pr-0">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.title} href={card.href} className={`rounded-xl border p-2.5 transition-colors hover:-translate-y-0.5 hover:border-[color:var(--brand-accent)] sm:p-3 ${card.tone}`}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-background/70 text-foreground sm:h-8 sm:w-8">
              <Icon size={15} />
            </span>
            <span className="mt-2 block text-xs font-semibold leading-tight text-foreground sm:mt-3 sm:text-sm">{card.title}</span>
            <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">{card.description}</span>
          </Link>
        );
      })}
      </div>
    </div>
  );
}

type CreateMode = "quick" | "anything" | "campaign" | "product_bulk" | "set" | "image" | "video" | "carousel";

function generationCountForCreateMode(mode: CreateMode, contentType?: GenerateContentRequest["content_type"]) {
  if (mode === "quick" && contentType === "mixed") return 3;
  if (mode === "set" || mode === "anything") return 3;
  return 1;
}

type QuickAssetKind = "product" | "style" | "character" | "icon";

type QuickSavedAsset = {
  id: string;
  kind: QuickAssetKind | "logo";
  name: string;
  dataUrl: string;
  createdAt: string;
  url?: string;
  status?: "uploading" | "uploaded" | "failed" | "local";
  error?: string;
  storageBackend?: string;
};

type QuickCreativeBrief = {
  logo?: { enabled: boolean; source: "brand_default" | "brand_alt" | "uploaded" | "none"; name?: string; url?: string };
  colors?: { enabled: boolean; values: string[] };
  output_type?: "mixed" | "image" | "video" | "carousel";
  required_sizes?: { ids: string[]; labels: string[]; aspect_ratios: string[]; notes: string[] };
  reference_assets?: { kind: QuickAssetKind; names: string[]; urls: string[]; count: number; instruction: string }[];
  hook?: string;
  short_description?: string;
  terms?: string;
  text_limits?: { hook_max_chars: number; hook_max_area_percent: number; short_description_max_chars: number; short_description_max_area_percent: number; terms_max_chars: number; terms_max_area_percent: number; terms_max_font_px: number };
};

type QuickSizeFormat = "image" | "video" | "carousel";

type QuickSizeOption = {
  id: string;
  label: string;
  helper: string;
  formats: QuickSizeFormat[];
  aspectRatios: string[];
  note: string;
};

const QUICK_ASSET_KINDS: { id: QuickAssetKind; label: string; helper: string; multiple: boolean; instruction: string }[] = [
  { id: "product", label: "Product photos", helper: "Keep the product shape unchanged as much as possible.", multiple: true, instruction: "Use as product references. Preserve product shape, proportions, colors, packaging, and key details. Do not redesign the product." },
  { id: "style", label: "Similar style", helper: "A visual style or concept to follow.", multiple: false, instruction: "Use as style or concept reference only. Do not copy protected marks or exact layout." },
  { id: "character", label: "Character / element", helper: "A person, mascot, object, or element to use.", multiple: true, instruction: "Use these as character, presenter, object, or element references where relevant." },
  { id: "icon", label: "Icons", helper: "Icons or small visual elements for the design.", multiple: true, instruction: "Use as icon or supporting graphic references." },
];

const QUICK_SIZE_OPTIONS: QuickSizeOption[] = [
  {
    id: "image_all",
    label: "All image sizes",
    helper: "Prepare all supported image placements.",
    formats: ["image", "carousel"],
    aspectRatios: ["4:5", "1:1", "9:16", "16:9", "1.91:1"],
    note: "Generate or adapt the image concept for Instagram 4:5, Meta square 1:1, vertical story 9:16, wide 16:9, and Google Ads image requirements.",
  },
  {
    id: "instagram_post_4_5",
    label: "4:5 Instagram post",
    helper: "Portrait feed creative.",
    formats: ["image", "carousel"],
    aspectRatios: ["4:5"],
    note: "Optimize for Instagram feed portrait posts at 4:5.",
  },
  {
    id: "meta_square_1_1",
    label: "1:1 Meta square ad",
    helper: "Square ad creative.",
    formats: ["image", "carousel"],
    aspectRatios: ["1:1"],
    note: "Optimize for Meta square ads at 1:1.",
  },
  {
    id: "vertical_story_9_16",
    label: "9:16 vertical / story",
    helper: "Stories and vertical placements.",
    formats: ["image", "video"],
    aspectRatios: ["9:16"],
    note: "Optimize for vertical story placements at 9:16.",
  },
  {
    id: "wide_16_9",
    label: "16:9 wide",
    helper: "Landscape placements.",
    formats: ["image", "video"],
    aspectRatios: ["16:9"],
    note: "Optimize for wide landscape placements at 16:9.",
  },
  {
    id: "google_ads_all",
    label: "Google Ads image sizes",
    helper: "All Google image ad requirements.",
    formats: ["image"],
    aspectRatios: ["1:1", "1.91:1", "4:5", "9:16", "16:9"],
    note: "Plan responsive Google Ads image assets and crops, including square, landscape, portrait, and vertical variants.",
  },
  {
    id: "video_story_reel_9_16",
    label: "9:16 video / story / reel",
    helper: "Vertical reel or story video.",
    formats: ["video"],
    aspectRatios: ["9:16"],
    note: "Generate video for vertical reels and stories at 9:16.",
  },
  {
    id: "video_wide_16_9",
    label: "16:9 video wide",
    helper: "Landscape video creative.",
    formats: ["video"],
    aspectRatios: ["16:9"],
    note: "Generate video for wide landscape placements at 16:9.",
  },
];

function quickSizeMatchesContentType(option: QuickSizeOption, contentType: QuickCreativeBrief["output_type"]) {
  if (!contentType || contentType === "mixed") return true;
  if (contentType === "carousel") return option.formats.includes("carousel") || option.formats.includes("image");
  return option.formats.includes(contentType);
}

function quickAssetStorageKey(suiteId: string) {
  return `oneshare.quickAssets.${suiteId}`;
}

function trimText(value: string, max: number) {
  return value.slice(0, max);
}

async function fileToSavedAsset(file: File, kind: QuickSavedAsset["kind"]): Promise<QuickSavedAsset> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    name: file.name,
    dataUrl,
    createdAt: new Date().toISOString(),
    status: "uploading",
  };
}

function evaluateBrandReadiness(brand?: Suite["brand"] | null) {
  const services = [...(brand?.services || []), ...(brand?.products || [])].filter(Boolean);
  const audienceSignals = [
    brand?.target_audience,
    brand?.audience_notes,
    ...(brand?.audience_interests || []),
    ...(brand?.audience_languages || []),
  ].filter(Boolean);
  const messageSignals = [
    brand?.description,
    brand?.unique_value,
    brand?.how_they_help,
    ...(brand?.usp_points || []),
    ...(brand?.esp_points || []),
  ].filter(Boolean);
  const hasIdentity = Boolean(brand?.name || brand?.niche || brand?.industry);
  const ready = Boolean(hasIdentity && (services.length > 0 || messageSignals.length > 0) && audienceSignals.length > 0);

  if (ready) {
    return { ready, label: "Use brand", detail: "Brand profile has enough identity, audience, and offer context." };
  }
  if (hasIdentity || services.length > 0 || audienceSignals.length > 0 || messageSignals.length > 0) {
    return { ready, label: "Limited brand", detail: "Brand profile is partial; generated content may need more manual direction." };
  }
  return { ready, label: "No brand yet", detail: "Add brand/profile details before relying on brand memory." };
}

function CreateCommandCenter({
  suiteId,
  onGenerate,
  generating,
  generationStatus,
}: {
  suiteId: string;
  onGenerate: (request: GenerateContentRequest) => Promise<void>;
  generating: boolean;
  generationStatus?: GenerationStatus | null;
}) {
  const [mode, setMode] = useState<CreateMode>("quick");
  const [useBrand, setUseBrand] = useState(false);
  const [brandReadiness, setBrandReadiness] = useState(evaluateBrandReadiness(null));
  const [suiteBrand, setSuiteBrand] = useState<Suite["brand"] | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [contentType, setContentType] = useState<"mixed" | "image" | "video" | "carousel">("mixed");
  const [requiredSizes, setRequiredSizes] = useState<string[]>(["image_all"]);
  const [aspectRatio, setAspectRatio] = useState("Auto");
  const [prompt, setPrompt] = useState("");
  const [destination, setDestination] = useState("both");
  const [modelTier, setModelTier] = useState("auto");
  const [quickOptionsOpen, setQuickOptionsOpen] = useState(true);
  const [selectedLogo, setSelectedLogo] = useState("brand_default");
  const [logoEnabled, setLogoEnabled] = useState(true);
  const [savedAssets, setSavedAssets] = useState<QuickSavedAsset[]>([]);
  const [assetUploadError, setAssetUploadError] = useState("");
  const [colorsEnabled, setColorsEnabled] = useState(false);
  const [briefColors, setBriefColors] = useState<string[]>(["#0a0a0a", "#f8d84a", "#ff4fa3"]);
  const [hook, setHook] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [terms, setTerms] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.suites.get(suiteId).then((suite) => {
      if (cancelled) return;
      const readiness = evaluateBrandReadiness(suite.brand);
      setSuiteBrand(suite.brand || null);
      setBrandReadiness(readiness);
      setUseBrand(readiness.ready);
      setLogoEnabled(true);
      const brandColors = suite.brand?.colors;
      if (brandColors?.primary || brandColors?.secondary || brandColors?.accent) {
        setColorsEnabled(true);
        setBriefColors([brandColors.primary, brandColors.secondary, brandColors.accent].filter(Boolean).slice(0, 3) as string[]);
      }
    }).catch(() => {
      if (!cancelled) {
        setBrandReadiness({ ready: false, label: "Brand unknown", detail: "Brand readiness could not be checked; generated content will use the prompt only." });
        setUseBrand(false);
      }
    });
    return () => { cancelled = true; };
  }, [suiteId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(quickAssetStorageKey(suiteId));
      if (raw) {
        const parsed = JSON.parse(raw) as QuickSavedAsset[];
        setSavedAssets(parsed.map((asset) => ({ ...asset, status: asset.url ? (asset.status || "uploaded") : (asset.status === "failed" ? "failed" : "local") })));
      }
    } catch {
      setSavedAssets([]);
    }
  }, [suiteId]);

  useEffect(() => {
    try {
      localStorage.setItem(quickAssetStorageKey(suiteId), JSON.stringify(savedAssets.slice(-40)));
    } catch {
      // Local asset cache is best-effort; generation should still work.
    }
  }, [suiteId, savedAssets]);

  useEffect(() => {
    setRequiredSizes((current) => {
      const validIds = new Set(QUICK_SIZE_OPTIONS.filter((option) => quickSizeMatchesContentType(option, contentType)).map((option) => option.id));
      const next = current.filter((id) => validIds.has(id));
      if (next.length > 0) return next;
      const fallback = QUICK_SIZE_OPTIONS.find((option) => validIds.has(option.id));
      return fallback ? [fallback.id] : current;
    });
  }, [contentType]);

  async function addQuickAssets(files: FileList | null, kind: QuickSavedAsset["kind"]) {
    if (!files?.length) return;
    setAssetUploadError("");
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const entries = await Promise.all(imageFiles.map(async (file) => ({ file, asset: await fileToSavedAsset(file, kind) })));
    const next = entries.map((entry) => entry.asset);
    setSavedAssets((current) => [...current, ...next].slice(-40));
    if (kind === "logo" && next[0]) {
      setSelectedLogo(next[0].id);
      setLogoEnabled(true);
    }

    await Promise.all(entries.map(async ({ file, asset }) => {
      try {
        const uploaded = await api.content.uploadQuickAsset(suiteId, kind, file);
        setSavedAssets((current) => current.map((item) => item.id === asset.id ? {
          ...item,
          name: uploaded.name || item.name,
          url: uploaded.url,
          status: "uploaded",
          error: undefined,
          storageBackend: uploaded.storage?.backend,
        } : item));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setAssetUploadError(message);
        setSavedAssets((current) => current.map((item) => item.id === asset.id ? { ...item, status: "failed", error: message } : item));
      }
    }));
  }

  function removeQuickAsset(assetId: string) {
    setSavedAssets((current) => current.filter((asset) => asset.id !== assetId));
    if (selectedLogo === assetId) setSelectedLogo("brand_default");
  }

  const brandLogos = suiteBrand?.brand_logos || [];
  const uploadedLogos = savedAssets.filter((asset) => asset.kind === "logo");
  const selectedLogoAsset = uploadedLogos.find((asset) => asset.id === selectedLogo);
  const referenceGroups = QUICK_ASSET_KINDS.map((kind) => ({ ...kind, assets: savedAssets.filter((asset) => asset.kind === kind.id) }));
  const visibleSizeOptions = QUICK_SIZE_OPTIONS.filter((option) => quickSizeMatchesContentType(option, contentType));
  const selectedSizeOptions = QUICK_SIZE_OPTIONS.filter((option) => requiredSizes.includes(option.id));
  const selectedAspectRatios = Array.from(new Set(selectedSizeOptions.flatMap((option) => option.aspectRatios)));
  const selectedLogoAssetName = selectedLogoAsset?.name;
  const uploadedAssetCount = savedAssets.filter((asset) => asset.status === "uploaded" && asset.url).length;
  const quickAssetUploading = savedAssets.some((asset) => asset.status === "uploading");
  const quickAssetFailed = savedAssets.some((asset) => asset.status === "failed");
  const quickCreateBlocked = mode === "quick" && (quickAssetUploading || quickAssetFailed);
  const brandDefaultLogoUrl = suiteBrand?.logo_url;
  let selectedLogoMeta: QuickCreativeBrief["logo"] = { enabled: logoEnabled, source: "none" };
  if (selectedLogoAssetName && selectedLogoAsset?.url) {
    selectedLogoMeta = { enabled: logoEnabled, source: "uploaded", name: selectedLogoAssetName, url: selectedLogoAsset.url };
  } else if (selectedLogo === "brand_default" && brandDefaultLogoUrl) {
    selectedLogoMeta = { enabled: logoEnabled, source: "brand_default", url: brandDefaultLogoUrl };
  } else if (selectedLogo.startsWith("brand_logo:")) {
    selectedLogoMeta = { enabled: logoEnabled, source: "brand_alt", url: selectedLogo.replace("brand_logo:", "") };
  }
  const quickCreativeBrief: QuickCreativeBrief = {
    logo: selectedLogoMeta,
    colors: { enabled: colorsEnabled, values: briefColors.filter(Boolean).slice(0, 3) },
    output_type: contentType,
    required_sizes: {
      ids: selectedSizeOptions.map((option) => option.id),
      labels: selectedSizeOptions.map((option) => option.label),
      aspect_ratios: selectedAspectRatios,
      notes: selectedSizeOptions.map((option) => option.note),
    },
    reference_assets: referenceGroups
      .map((group) => ({ ...group, assets: group.assets.filter((asset) => asset.status === "uploaded" && asset.url) }))
      .filter((group) => group.assets.length > 0)
      .map((group) => ({
        kind: group.id,
        names: group.assets.map((asset) => asset.name),
        urls: group.assets.map((asset) => asset.url as string),
        count: group.assets.length,
        instruction: group.instruction,
      })),
    hook: hook.trim() || undefined,
    short_description: shortDescription.trim() || undefined,
    terms: terms.trim() || undefined,
    text_limits: {
      hook_max_chars: 30,
      hook_max_area_percent: 15,
      short_description_max_chars: 60,
      short_description_max_area_percent: 5,
      terms_max_chars: 25,
      terms_max_area_percent: 5,
      terms_max_font_px: 10,
    },
  };

  const modes: {
    id: CreateMode;
    title: string;
    icon: typeof Zap;
  }[] = [
    { id: "quick", title: "Quick Post/Ad", icon: Wand2 },
    { id: "video", title: "Video", icon: Video },
    { id: "image", title: "Image", icon: ImageIcon },
    { id: "carousel", title: "Carousel", icon: LayoutList },
  ];
  const modeUnavailable = false;
  const compactStatusVisible = generationStatus && generationStatus.status !== "idle" && (generating || isGenerationActive(generationStatus) || isRecentTerminalGenerationStatus(generationStatus));

  return (
    <section id="create" className="os-surface rounded-xl p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="os-accent-icon flex h-8 w-8 items-center justify-center rounded-lg">
            <Sparkles size={16} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Create & generate</h2>
            <p className="text-xs text-muted-foreground">Choose the job first. Details stay quiet until needed.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setUseBrand((value) => brandReadiness.ready ? !value : false)}
          disabled={!brandReadiness.ready}
          title={brandReadiness.detail}
          className={`flex h-9 items-center justify-between gap-3 rounded-full border px-3 text-xs font-medium transition-colors ${
            useBrand
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : brandReadiness.ready
                ? "border-border bg-card text-muted-foreground"
                : "os-warning-panel"
          } disabled:cursor-not-allowed`}
        >
          <span className={`h-2 w-2 rounded-full ${useBrand ? "bg-emerald-500" : "bg-muted-foreground"}`} />
          {useBrand ? "Use brand" : brandReadiness.label}
        </button>
      </div>
      {!brandReadiness.ready && (
        <p className="mt-2 text-xs text-muted-foreground" dir="auto">{brandReadiness.detail}</p>
      )}

      <div className="mt-3 flex max-w-full gap-1 os-scroll-x rounded-xl border border-border bg-card/70 p-1 sm:mt-4">
        {modes.map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                setContentType(item.id === "quick" ? "mixed" : item.id as "image" | "video" | "carousel");
              }}
              className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {item.title}
            </button>
          );
        })}
      </div>

      {compactStatusVisible && (
        <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${jobStatusTone(generationStatus?.status)}`} aria-live={generating ? "polite" : "off"}>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-medium">
              {generating ? <Loader2 size={13} className="animate-spin" /> : generationStatus?.status === "completed" ? <CheckCircle2 size={13} /> : generationStatus?.status === "failed" ? <XCircle size={13} /> : <Clock3 size={13} />}
              Generation status: {jobStatusLabel(generationStatus?.status)}
            </span>
            <span>{Math.max(0, Math.min(100, generationStatus?.progress || 0))}%</span>
          </div>
          {(generating || typeof generationStatus?.progress === "number") && (
            <div className="os-progress-track mt-2 h-1.5 overflow-hidden rounded-full">
              <div className="os-progress-fill h-full rounded-full transition-all" style={{ width: `${Math.max(5, Math.min(100, generationStatus?.progress || (generating ? 10 : 100)))}%` }} />
            </div>
          )}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-border bg-background p-3 sm:mt-4">
        <textarea
          rows={6}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-40 w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[color:var(--brand-accent)] focus:ring-4 focus:ring-blue-500/10"
          placeholder={mode === "campaign" ? "Describe the campaign offer, objective, and audience..." : mode === "image" ? "Describe the image you want..." : mode === "video" ? "Describe the video scene, rhythm, and message..." : mode === "carousel" ? "Describe the carousel topic and learning points..." : "What should we create?"}
          dir="auto"
        />
        {mode === "quick" && (
          <div className="mt-3 space-y-3 rounded-xl border border-border bg-card/60 p-3">
            <button
              type="button"
              onClick={() => setQuickOptionsOpen((value) => !value)}
              className="flex w-full items-center justify-between gap-2 text-start text-xs font-medium text-foreground"
            >
              <span className="flex items-center gap-2"><SlidersHorizontal size={14} /> Optional ad details</span>
              <ChevronDown size={13} className={`transition-transform ${quickOptionsOpen ? "rotate-180" : ""}`} />
            </button>
            {quickOptionsOpen && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">Logo</span>
                      <button type="button" onClick={() => setLogoEnabled((value) => !value)} className={`rounded-full px-2 py-0.5 text-[11px] ${logoEnabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{logoEnabled ? "On" : "Off"}</button>
                    </div>
                    <div className="mt-2 grid gap-2">
                      <select value={selectedLogo} onChange={(e) => setSelectedLogo(e.target.value)} disabled={!logoEnabled} className="h-9 rounded-lg border border-input bg-card px-2 text-xs text-foreground outline-none disabled:opacity-50">
                        <option value="brand_default">Brand default logo</option>
                        {brandLogos.map((logo, index) => <option key={logo.url || index} value={`brand_logo:${logo.url}`}>Brand logo {index + 1}</option>)}
                        {uploadedLogos.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                        {!suiteBrand?.logo_url && brandLogos.length === 0 && uploadedLogos.length === 0 && <option value="none">No logo yet</option>}
                      </select>
                      <label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground hover:text-foreground">
                        <UploadCloud size={13} /> Upload logo
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => addQuickAssets(e.target.files, "logo")} />
                      </label>
                      {uploadedLogos.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">{uploadedLogos.filter((asset) => asset.url).length}/{uploadedLogos.length} uploaded</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><Palette size={13} /> Colors</span>
                      <button type="button" onClick={() => brandReadiness.ready && setColorsEnabled((value) => !value)} disabled={!brandReadiness.ready} className={`rounded-full px-2 py-0.5 text-[11px] disabled:opacity-50 ${colorsEnabled ? "bg-blue-500/10 text-blue-600 dark:text-blue-300" : "bg-muted text-muted-foreground"}`}>{colorsEnabled ? "On" : "Off"}</button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[0, 1, 2].map((index) => (
                        <label key={index} className="space-y-1">
                          <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
                          <input type="color" value={briefColors[index] || "#000000"} disabled={!colorsEnabled} onChange={(e) => setBriefColors((current) => { const next = [...current]; next[index] = e.target.value; return next; })} className="h-9 w-full rounded border border-input bg-card disabled:opacity-40" />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-foreground">Output type</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["mixed", "image", "video", "carousel"] as const).map((type) => (
                      <button key={type} type="button" onClick={() => setContentType(type)} className={`min-h-9 rounded-full border px-3 py-1 text-xs capitalize transition-colors ${contentType === type ? "border-[color:var(--brand-accent)] bg-blue-500/10 text-[color:var(--brand-accent-strong)] dark:text-blue-300" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                        {type === "mixed" ? "Mix: video + image + carousel" : type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-foreground">Required size</span>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {visibleSizeOptions.map((option) => {
                      const active = requiredSizes.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setRequiredSizes((current) => {
                            const allIds = new Set(["image_all", "google_ads_all"]);
                            if (allIds.has(option.id)) return [option.id];
                            const withoutAll = current.filter((id) => !allIds.has(id));
                            const next = active ? withoutAll.filter((id) => id !== option.id) : [...withoutAll, option.id];
                            return next.length ? next : [option.id];
                          })}
                          className={`min-h-14 rounded-lg border px-3 py-2 text-start transition-colors ${active ? "border-[color:var(--brand-accent)] bg-blue-500/10 text-[color:var(--brand-accent-strong)] dark:text-blue-300" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                        >
                          <span className="block text-xs font-semibold">{option.label}</span>
                          <span className="mt-1 block text-[11px] leading-relaxed opacity-80">{option.helper}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedAspectRatios.length > 0 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Selected ratios: {selectedAspectRatios.join(", ")}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {referenceGroups.map((group) => (
                    <div key={group.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{group.label}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{group.helper}</p>
                        </div>
                        <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground">
                          <Plus size={12} /> Add
                          <input type="file" accept="image/*" multiple={group.multiple} className="hidden" onChange={(e) => addQuickAssets(e.target.files, group.id)} />
                        </label>
                      </div>
                      {group.assets.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {group.assets.slice(-6).map((asset) => (
                            <span key={asset.id} className="group relative inline-flex h-12 w-12 overflow-hidden rounded-lg border border-border bg-card">
                              <img src={asset.dataUrl} alt={asset.name} className="h-full w-full object-cover" />
                              <span className={`absolute bottom-0.5 left-0.5 h-2 w-2 rounded-full ${asset.status === "uploaded" ? "bg-emerald-500" : asset.status === "failed" ? "bg-destructive" : "bg-amber-400"}`} title={asset.status === "uploaded" ? "Uploaded" : asset.status === "failed" ? asset.error || "Upload failed" : "Uploading"} />
                              <button type="button" onClick={() => removeQuickAsset(asset.id)} className="absolute right-0.5 top-0.5 hidden h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground group-hover:flex"><X size={11} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {(quickAssetUploading || quickAssetFailed || uploadedAssetCount > 0) && (
                  <div className={`rounded-lg border px-3 py-2 text-xs ${quickAssetFailed ? "border-destructive/40 bg-destructive/10 text-destructive" : quickAssetUploading ? "os-warning-panel" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
                    {quickAssetUploading && "Uploading reference assets before generation..."}
                    {quickAssetFailed && (assetUploadError || "Some reference assets failed to upload. Remove them or upload again before creating.")}
                    {!quickAssetUploading && !quickAssetFailed && `${uploadedAssetCount} reference asset${uploadedAssetCount === 1 ? "" : "s"} ready for generation.`}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1">
                    <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">Hook · 30 chars <span title="Large text, max 15% of the image area."><HelpCircle size={12} /></span></span>
                    <input value={hook} maxLength={30} onChange={(e) => setHook(trimText(e.target.value, 30))} className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground outline-none" placeholder="Big promise" dir="auto" />
                    <span className="block text-end text-[10px] text-muted-foreground">{hook.length}/30</span>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Short text · 60 chars</span>
                    <input value={shortDescription} maxLength={60} onChange={(e) => setShortDescription(trimText(e.target.value, 60))} className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground outline-none" placeholder="Small supporting line" dir="auto" />
                    <span className="block text-end text-[10px] text-muted-foreground">{shortDescription.length}/60</span>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Terms · 25 chars</span>
                    <input value={terms} maxLength={25} onChange={(e) => setTerms(trimText(e.target.value, 25))} className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground outline-none" placeholder="Limited offer" dir="auto" />
                    <span className="block text-end text-[10px] text-muted-foreground">{terms.length}/25</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {mode !== "quick" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(["mixed", "image", "video", "carousel"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setContentType(type)}
                className={`min-h-9 rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                  contentType === type
                    ? "border-[color:var(--brand-accent)] bg-blue-500/10 text-[color:var(--brand-accent-strong)] dark:text-blue-300"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            onClick={() => onGenerate({
              mode,
              prompt,
              content_type: mode === "image" || mode === "video" || mode === "carousel" ? mode : contentType,
              aspect_ratio: mode === "quick" && selectedAspectRatios.length === 1 ? selectedAspectRatios[0] : aspectRatio,
              destination,
              model_tier: modelTier,
              use_brand: useBrand,
              creative_brief: mode === "quick" ? quickCreativeBrief : undefined,
              count: generationCountForCreateMode(
                mode,
                mode === "image" || mode === "video" || mode === "carousel" ? mode : contentType,
              ),
            })}
            disabled={generating || modeUnavailable || quickCreateBlocked}
            title={quickCreateBlocked ? "Wait for uploads to finish or remove failed assets before creating." : modeUnavailable ? "Campaign Builder is being prepared. Use Quick Post/Ad or Create anything for now." : undefined}
            className="min-h-11 w-full gap-2 bg-[color:var(--brand-accent)] hover:bg-[color:var(--brand-accent-strong)] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:w-auto"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {generating ? "Generating…" : mode === "quick" ? "Create post" : mode === "campaign" ? "Build campaign draft" : mode === "image" ? "Create image" : mode === "video" ? "Create video" : mode === "carousel" ? "Create carousel" : "Generate"}
          </Button>
        </div>
        {modeUnavailable && (
          <p className="mt-2 text-xs text-muted-foreground">
            Campaign Builder is visible for planning, but full campaign creation is not active yet. Use Quick Post/Ad, Content Set, Image, Video, or Carousel for production generation.
          </p>
        )}

        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className="mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal size={13} />
          Advanced settings
          <ChevronDown size={13} className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
        </button>
        {advancedOpen && (
          <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Destination</span>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground outline-none"
              >
                <option value="both">Both</option>
                <option value="social">Social media</option>
                <option value="ads">Ads</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Model</span>
              <select
                value={modelTier}
                onChange={(e) => setModelTier(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground outline-none"
              >
                <option value="auto">Auto</option>
                <option value="fast">Fast draft</option>
                <option value="quality">Highest quality</option>
              </select>
            </label>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Meta Ads Inspiration ────────────────────────────────────────────────────

export function MetaAdsInspirationSection({ suiteId }: { suiteId: string }) {
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [libraryUrl, setLibraryUrl] = useState("");
  const [warning, setWarning] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setWarning("");
    try {
      const res = await api.suites.metaAds(suiteId);
      setAds(res.ads || []);
      setLibraryUrl(res.library_url);
      setWarning(res.warning || "");
      setLoaded(true);
    } catch (e: unknown) {
      setWarning(e instanceof Error ? e.message : "Failed to fetch Meta ads");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Globe size={14} className="text-blue-400" /> Meta Ads Inspiration
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Active ads from Meta Ad Library for this business context.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5 h-8 text-xs"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Fetch Meta ads
        </Button>
      </div>

      {warning && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100" dir="auto">
          {warning}
        </div>
      )}

      {loaded && ads.length === 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-zinc-800 p-4 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <span>No ads returned from the API. You can still inspect the prepared Ad Library search.</span>
          {libraryUrl && (
            <a
              href={libraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
            >
              Open Ad Library
            </a>
          )}
        </div>
      )}

      {ads.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <a
              key={ad.id}
              href={ad.snapshot_url || libraryUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-44 flex-col rounded-lg border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-zinc-600"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100" dir="auto">{ad.page_name || "Meta ad"}</p>
                  {ad.start_time && (
                    <p className="mt-0.5 text-xs text-zinc-600">
                      Since {new Date(ad.start_time).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 border-blue-900 bg-blue-950 text-xs text-blue-300">
                  Ad
                </Badge>
              </div>
              {ad.title && <p className="mt-3 text-sm font-medium text-zinc-200" dir="auto">{ad.title}</p>}
              <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-zinc-400" dir="auto">
                {ad.body || ad.description || "Open in Meta Ad Library to inspect this ad."}
              </p>
              {ad.platforms && ad.platforms.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1 pt-3">
                  {ad.platforms.slice(0, 3).map((p) => (
                    <span key={p} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-400">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Connected Meta Campaigns ────────────────────────────────────────────────

export function CampaignsHub({ suiteId }: { suiteId: string }) {
  const [source, setSource] = useState<"all" | "meta" | "google">("all");

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-400" /> Campaigns
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Live campaigns by source. Creation and editing actions will land here.</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {(["all", "meta", "google"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSource(item)}
                className={`rounded px-3 py-1.5 text-xs capitalize transition-colors ${
                  source === item ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left hover:border-zinc-700">
            <p className="text-sm font-medium text-zinc-100">Create campaign</p>
            <p className="mt-1 text-xs text-zinc-500">Build copy, creatives, budget, and audience draft.</p>
          </button>
          <button className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left hover:border-zinc-700">
            <p className="text-sm font-medium text-zinc-100">Edit selected</p>
            <p className="mt-1 text-xs text-zinc-500">Budget, dates, audiences, and creative set.</p>
          </button>
          <button className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left hover:border-zinc-700">
            <p className="text-sm font-medium text-zinc-100">Pause / resume</p>
            <p className="mt-1 text-xs text-zinc-500">Controls will activate after write permissions.</p>
          </button>
        </div>
      </div>

      {(source === "all" || source === "meta") && <MetaCampaignsSection suiteId={suiteId} />}
      {(source === "all" || source === "google") && <GoogleAdsCampaignsSection suiteId={suiteId} />}
    </section>
  );
}

function metaInsights(edge?: MetaCampaign["insights"]) {
  return edge?.data?.[0] || {};
}

function metaNumber(value?: string) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}

function metaMoney(value?: string) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

function MetaMetricStrip({ insights }: { insights?: MetaCampaign["insights"] }) {
  const data = metaInsights(insights);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <MetaMetric label="Spend" value={metaMoney(data.spend)} />
      <MetaMetric label="Reach" value={metaNumber(data.reach)} />
      <MetaMetric label="Impressions" value={metaNumber(data.impressions)} />
      <MetaMetric label="Clicks" value={metaNumber(data.clicks)} />
    </div>
  );
}

function MetaMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function MetaCampaignsSection({ suiteId }: { suiteId: string }) {
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    setWarning("");
    try {
      const res = await api.connections.campaigns(suiteId);
      setCampaigns(res.campaigns || []);
      setWarning(res.warning || "");
      setLoaded(true);
    } catch (e: unknown) {
      setWarning(e instanceof Error ? e.message : "Failed to fetch campaigns");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <BarChart3 size={14} className="text-emerald-400" /> Active Meta Campaigns
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Live campaigns only, with ad sets, ads, and current numbers.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5 h-8 text-xs"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Fetch campaigns
        </Button>
      </div>

      {warning && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100" dir="auto">
          {warning}
        </div>
      )}

      {loaded && campaigns.length === 0 && !warning && (
        <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
          No active campaigns found in the connected ad account.
        </p>
      )}

      {campaigns.length > 0 && (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium text-zinc-100" dir="auto">{campaign.name}</p>
                <Badge variant="outline" className="shrink-0 border-emerald-900 bg-emerald-950 text-xs text-emerald-300">
                  {campaign.effective_status || campaign.status || "UNKNOWN"}
                </Badge>
              </div>
              <MetaMetricStrip insights={campaign.insights} />
              <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-zinc-500">
                {campaign.objective && <span className="rounded bg-zinc-800 px-1.5 py-0.5">{campaign.objective}</span>}
                {campaign.buying_type && <span className="rounded bg-zinc-800 px-1.5 py-0.5">{campaign.buying_type}</span>}
              </div>
              {(campaign.adsets?.data || []).length > 0 && (
                <div className="space-y-2">
                  {(campaign.adsets?.data || []).map((adset) => (
                    <div key={adset.id} className="rounded-lg border border-zinc-800 bg-black/30 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-zinc-200" dir="auto">{adset.name}</p>
                          <p className="mt-0.5 text-[11px] text-zinc-600">
                            Ad set{adset.optimization_goal ? ` · ${adset.optimization_goal}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 border-zinc-700 text-[10px] text-zinc-400">
                          {adset.effective_status || adset.status || "UNKNOWN"}
                        </Badge>
                      </div>
                      <MetaMetricStrip insights={adset.insights} />
                      {(adset.ads?.data || []).length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {(adset.ads?.data || []).map((ad) => (
                            <div key={ad.id} className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs text-zinc-300" dir="auto">{ad.name}</p>
                                <Badge variant="outline" className="shrink-0 border-zinc-800 text-[10px] text-zinc-500">
                                  {ad.effective_status || ad.status || "UNKNOWN"}
                                </Badge>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                                <MetaMetric label="Spend" value={metaMoney(metaInsights(ad.insights).spend)} />
                                <MetaMetric label="Reach" value={metaNumber(metaInsights(ad.insights).reach)} />
                                <MetaMetric label="Impr." value={metaNumber(metaInsights(ad.insights).impressions)} />
                                <MetaMetric label="Clicks" value={metaNumber(metaInsights(ad.insights).clicks)} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Google Ads Campaigns ────────────────────────────────────────────────────

function GoogleAdsCampaignsSection({ suiteId }: { suiteId: string }) {
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    setWarning("");
    try {
      const res = await api.connections.googleCampaigns(suiteId);
      setCampaigns(res.campaigns || []);
      setWarning(res.warning || "");
      setLoaded(true);
    } catch (e: unknown) {
      setWarning(e instanceof Error ? e.message : "Failed to fetch Google Ads campaigns");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <BarChart3 size={14} className="text-amber-400" /> Active Google Ads Campaigns
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Read-only campaigns, ad groups, ads, and last 30 days numbers.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5 h-8 text-xs"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Fetch Google campaigns
        </Button>
      </div>

      {warning && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100" dir="auto">
          {warning}
        </div>
      )}

      {loaded && campaigns.length === 0 && !warning && (
        <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
          No active Google Ads campaigns found.
        </p>
      )}

      {campaigns.length > 0 && (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100" dir="auto">{campaign.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">{campaign.channel_type || "Google Ads"}</p>
                </div>
                <Badge variant="outline" className="shrink-0 border-amber-900 bg-amber-950 text-xs text-amber-300">
                  {campaign.status || "ENABLED"}
                </Badge>
              </div>
              <GoogleMetricStrip metrics={campaign.metrics} />
              {(campaign.ad_groups || []).length > 0 && (
                <div className="space-y-2">
                  {campaign.ad_groups.map((group) => (
                    <div key={group.id} className="rounded-lg border border-zinc-800 bg-black/30 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-zinc-200" dir="auto">{group.name}</p>
                          <p className="mt-0.5 text-[11px] text-zinc-600">Ad group{group.type ? ` · ${group.type}` : ""}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 border-zinc-700 text-[10px] text-zinc-400">
                          {group.status || "ENABLED"}
                        </Badge>
                      </div>
                      <GoogleMetricStrip metrics={group.metrics} compact />
                      {(group.ads || []).length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {group.ads.map((ad) => (
                            <div key={ad.id} className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-xs text-zinc-300" dir="auto">{ad.name}</p>
                                <Badge variant="outline" className="shrink-0 border-zinc-800 text-[10px] text-zinc-500">
                                  {ad.status || "ENABLED"}
                                </Badge>
                              </div>
                              <GoogleMetricStrip metrics={ad.metrics} compact />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoogleMetricStrip({ metrics, compact = false }: { metrics?: GoogleAdsCampaign["metrics"]; compact?: boolean }) {
  const data = metrics || { cost: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, average_cpc: 0 };
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <MetaMetric label="Cost" value={data.cost.toLocaleString()} />
      <MetaMetric label={compact ? "Impr." : "Impressions"} value={data.impressions.toLocaleString()} />
      <MetaMetric label="Clicks" value={data.clicks.toLocaleString()} />
      <MetaMetric label="Conv." value={data.conversions.toLocaleString()} />
    </div>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────

function stringFromMetadata(metadata: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function mediaReadinessState(value: Post["media_readiness"]) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.state || "";
}

function mediaReadinessReason(value: Post["media_readiness"]) {
  if (!value || typeof value === "string") return "";
  return value.reason || "";
}

function mediaReadinessItems(value: Post["media_readiness"]) {
  if (!value || typeof value === "string") return [];
  return value.items || [];
}

function mediaReadinessForPost(post: Post) {
  const metadata = post.ai_metadata || {};
  const readinessItems = mediaReadinessItems(post.media_readiness);
  const readinessUrls = readinessItems.map((item) => item.url).filter(Boolean);
  const urls = readinessUrls.length
    ? readinessUrls
    : post.media_public_urls?.length
    ? post.media_public_urls
    : post.media_public_url
      ? [post.media_public_url]
      : post.media_urls || [];
  const firstUrl = urls[0] || "";
  const normalizedUrl = firstUrl ? mediaUrl(firstUrl) : "";
  const explicitStatus = mediaReadinessState(post.media_readiness) || stringFromMetadata(metadata, ["media_readiness", "media_status", "media_state"]);
  const reason = post.media_readiness_reason
    || post.media_missing_reason
    || mediaReadinessReason(post.media_readiness)
    || stringFromMetadata(metadata, ["media_readiness_reason", "media_missing_reason", "media_error", "media_note"]);
  const localOnly = post.media_local_only
    || explicitStatus === "local-only"
    || readinessItems.some((item) => item.backend === "local" || item.public === false)
    || Boolean(firstUrl && !/^https:\/\//i.test(firstUrl));
  const previewReady = Boolean(normalizedUrl && !["missing", "failed", "unsupported"].includes(explicitStatus));
  const publishReady = explicitStatus === "ready"
    || post.media_ready === true
    || readinessItems.some((item) => item.publish_ready === true)
    || Boolean(normalizedUrl && !localOnly && !["missing", "failed", "unsupported", "local-only"].includes(explicitStatus));
  const status = publishReady || previewReady
    ? localOnly ? "local-only" : "ready"
    : explicitStatus || (normalizedUrl ? "failed" : "missing");

  return {
    url: normalizedUrl,
    rawUrl: firstUrl,
    ready: previewReady,
    publishReady,
    localOnly,
    status,
    reason: reason || (
      status === "missing"
        ? "Media is missing for this item."
        : status === "local-only"
          ? "Media is available only as a local/static file, not a durable public URL."
          : status === "unsupported"
            ? "This content type does not support media preview here."
            : "Media is not ready."
    ),
  };
}

function PostCard({
  post, suiteId, onApprove, onReject, onRegenerate, onPublish,
}: {
  post: Post;
  suiteId: string;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onRegenerate: (feedback?: string) => Promise<void>;
  onPublish: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(post.caption || "");
  const [draftTags, setDraftTags] = useState((post.hashtags || []).join(" "));
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [publishResult, setPublishResult] = useState<Record<string, string> | null>(null);
  const [publishWarning, setPublishWarning] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const isPending = post.status === "pending";
  const isApproved = post.status === "approved";
  const isPublished = post.status === "published";
  const fmt = post.format;
  const media = mediaReadinessForPost(post);
  const firstMediaUrl = media.url;
  const [mediaFailed, setMediaFailed] = useState(false);
  const [mediaLoadState, setMediaLoadState] = useState<"idle" | "loaded" | "failed">("idle");
  const FormatIcon = fmt === "carousel" ? LayoutList : fmt === "video" ? Video : ImageIcon;
  const generatedAt = new Date(post.created_at);
  const generatedLabel = Number.isNaN(generatedAt.getTime())
    ? post.created_at
    : generatedAt.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setActionError("");
    setActionNotice("");
    try {
      await fn();
      return true;
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Action failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    setBusy(true);
    setActionError("");
    setActionNotice("");
    try {
      const res = await api.content.publish(suiteId, post.id);
      setPublishResult(res.results);
      if (res.results.warnings) setPublishWarning(res.results.warnings as unknown as string);
      setActionNotice("Publish request completed.");
      await onPublish();
    } catch (e: unknown) {
      setPublishWarning(e instanceof Error ? e.message : "Publish failed");
      setActionError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    setBusy(true);
    setActionError("");
    setActionNotice("");
    try {
      await api.content.update(suiteId, post.id, {
        caption: draftCaption,
        hashtags: draftTags.split(/\s+/).filter(Boolean).map((tag) => tag.startsWith("#") ? tag : `#${tag}`),
      });
      setEditing(false);
      setActionNotice("Content saved.");
      await onPublish();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedule() {
    if (!publishAt) return;
    setBusy(true);
    setActionError("");
    setActionNotice("");
    try {
      await api.content.schedule(suiteId, post.id, new Date(publishAt).toISOString());
      setScheduleOpen(false);
      setActionNotice("Post scheduled.");
      await onPublish();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption() {
    setActionError("");
    setActionNotice("");
    try {
      await navigator.clipboard.writeText([post.caption, ...(post.hashtags || [])].filter(Boolean).join("\n\n"));
      setActionNotice("Caption copied.");
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Copy failed");
    }
  }

  async function markUsed() {
    setBusy(true);
    setActionError("");
    setActionNotice("");
    try {
      await api.content.markUsed(suiteId, post.id);
      setActionNotice("Marked as used outside app.");
      await onPublish();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to mark as used");
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    const reason = rejectReason.trim();
    if (!reason) return;
    const ok = await act(() => onReject(reason));
    if (ok) {
      setRejectOpen(false);
      setRejectReason("");
      setActionNotice("Content rejected.");
    }
  }

  const mediaErrorText = mediaFailed
    ? fmt === "video"
      ? "Video preview failed. Open the media URL to verify the file."
      : "Image preview failed. Open the media URL to verify the file."
    : media.reason;
  const canPreviewMedia = Boolean(firstMediaUrl && media.ready && !mediaFailed);
  const canDownloadMedia = Boolean(firstMediaUrl && media.ready && !mediaFailed);
  const regenerationRequest = post.ai_metadata?.regeneration_requested;
  const hasRegenerationRequest = Boolean(regenerationRequest);
  const regenerationFeedback = regenerationRequest && typeof regenerationRequest === "object" && "feedback" in regenerationRequest
    ? String(regenerationRequest.feedback || "").trim()
    : "";

  return (
    <Card className="bg-zinc-900 border-zinc-800 flex flex-col overflow-hidden">
      {/* Media preview */}
      <div className="relative bg-zinc-800 aspect-square w-full overflow-hidden" dir="ltr">
        {canPreviewMedia && fmt === "video" ? (
          <video
            src={firstMediaUrl}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-cover bg-zinc-950"
            onLoadedMetadata={() => setMediaLoadState("loaded")}
            onCanPlay={() => setMediaLoadState("loaded")}
            onError={() => {
              setMediaLoadState("failed");
              setMediaFailed(true);
            }}
          />
        ) : canPreviewMedia ? (
          <img
            src={firstMediaUrl}
            alt={post.topic || "post"}
            className="h-full w-full object-cover"
            onLoad={() => setMediaLoadState("loaded")}
            onError={() => {
              setMediaLoadState("failed");
              setMediaFailed(true);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <FormatIcon size={32} className="text-zinc-600" />
            <span className="text-xs text-zinc-500">{mediaErrorText}</span>
            {firstMediaUrl && media.ready && (
              <a
                href={firstMediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Open media
              </a>
            )}
          </div>
        )}
        {canPreviewMedia && mediaLoadState === "idle" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/30">
            <Loader2 size={18} className="animate-spin text-zinc-500" />
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
        {media.status !== "ready" && (
          <div className="absolute bottom-2 left-2 right-2">
            <Badge className="max-w-full truncate border-amber-900 bg-amber-950/80 text-amber-300 text-xs" variant="outline">
              Media {media.status.replace(/_/g, " ")}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="flex-1 flex flex-col p-4 gap-3">
        {hasRegenerationRequest && (
          <div className="rounded-lg border border-indigo-900 bg-indigo-950/30 px-3 py-2 text-xs text-indigo-200">
            <div className="flex items-center gap-2 font-medium">
              <RefreshCw size={12} className="animate-spin" />
              Regeneration requested. Original content is kept until the new version is ready.
            </div>
            {regenerationFeedback && (
              <p className="mt-1 line-clamp-2 text-indigo-200/75">{regenerationFeedback}</p>
            )}
          </div>
        )}
        {/* Caption */}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
              dir="auto"
            />
            <input
              value={draftTags}
              onChange={(e) => setDraftTags(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-indigo-300 outline-none"
              dir="auto"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={busy} className="h-8 bg-emerald-700 text-xs">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-8 border-zinc-700 text-xs text-zinc-300">Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-zinc-200 text-sm leading-relaxed line-clamp-4" dir="auto">
            {post.caption || post.topic}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Clock3 size={12} />
          <span dir="ltr">Generated {generatedLabel}</span>
        </div>

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
          <div className="flex flex-wrap gap-2 mt-auto pt-1">
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
              onClick={() => setRejectOpen((value) => !value)}
              disabled={busy}
              className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-900 gap-1 text-xs h-8"
            >
              <XCircle size={12} /> Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFeedbackOpen((value) => !value)}
              disabled={busy}
              className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-1 text-xs h-8 px-2"
              title="Regenerate"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-1 text-xs h-8 px-2">
              <Pencil size={12} />
            </Button>
          </div>
        )}
        {rejectOpen && (
          <div className="space-y-2 rounded-lg border border-red-950 bg-red-950/20 p-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Why are you rejecting this content?"
              className="w-full resize-none rounded border border-red-950 bg-black px-2 py-1.5 text-xs text-zinc-200 outline-none"
              dir="auto"
            />
            <Button size="sm" disabled={busy || rejectReason.trim().length === 0} onClick={submitReject} className="h-8 w-full bg-red-700 text-xs hover:bg-red-600">
              Submit rejection reason
            </Button>
          </div>
        )}
        {feedbackOpen && (
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder="What should change? We'll regenerate and remember this rule."
              className="w-full resize-none rounded border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-200 outline-none"
              dir="auto"
            />
            <Button size="sm" disabled={busy} onClick={() => act(() => onRegenerate(feedback))} className="h-8 w-full bg-indigo-600 text-xs">
              Regenerate with feedback
            </Button>
          </div>
        )}

        {/* Publish warning */}
        {publishWarning && (
          <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900 rounded px-2 py-1">{publishWarning}</p>
        )}
        {(actionNotice || actionError) && (
          <p
            className={`rounded border px-2 py-1 text-xs ${
              actionError
                ? "border-red-900 bg-red-950/40 text-red-300"
                : "border-emerald-900 bg-emerald-950/30 text-emerald-300"
            }`}
            dir="auto"
          >
            {actionError || actionNotice}
          </p>
        )}

        {/* Approved — show Publish button */}
        {isApproved && (
          <div className="flex flex-wrap gap-2 mt-auto pt-1">
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
              onClick={() => setScheduleOpen((value) => !value)}
              disabled={busy}
              className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-1 text-xs h-8"
            >
              <Calendar size={12} /> Schedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejectOpen((value) => !value)}
              disabled={busy}
              className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-900 gap-1 text-xs h-8"
            >
              <XCircle size={12} />
            </Button>
          </div>
        )}
        {scheduleOpen && (
          <div className="flex gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2">
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded border border-zinc-800 bg-black px-2 text-xs text-zinc-300 outline-none"
            />
            <Button size="sm" onClick={handleSchedule} disabled={busy || !publishAt} className="h-8 bg-indigo-600 text-xs">
              Save
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={copyCaption} className="h-8 border-zinc-800 px-2 text-xs text-zinc-400">
            <Copy size={12} /> Copy
          </Button>
          {canDownloadMedia ? (
            <a href={firstMediaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-800 px-2 text-xs text-zinc-400 hover:text-zinc-200">
              <ImageIcon size={12} /> Open media
            </a>
          ) : (
            <span className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-800 px-2 text-xs text-zinc-600" title={mediaErrorText}>
              <ImageIcon size={12} /> Preview unavailable
            </span>
          )}
          {canDownloadMedia ? (
            <a href={firstMediaUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-800 px-2 text-xs text-zinc-400 hover:text-zinc-200">
              <Download size={12} /> Download
            </a>
          ) : (
            <span className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-800 px-2 text-xs text-zinc-600" title={mediaErrorText}>
              <Download size={12} /> Download unavailable
            </span>
          )}
          {(isPending || isApproved) && (
            <Button size="sm" variant="outline" onClick={markUsed} disabled={busy} className="h-8 border-zinc-800 px-2 text-xs text-zinc-400">
              Used outside app
            </Button>
          )}
        </div>

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

export function ConnectionsPanel({ suiteId }: { suiteId: string }) {
  const [connections, setConnections] = useState<Connections>({});
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [storageTest, setStorageTest] = useState<StorageTestResult | null>(null);
  const [testingStorage, setTestingStorage] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.connections.get(suiteId).then(setConnections).catch(() => {});
    api.suites.storageStatus(suiteId).then(setStorage).catch(() => {});
  }, [suiteId]);

  async function connectMeta() {
    setConnecting(true);
    setConnectionError("");
    try {
      const { url } = await api.connections.metaAuthUrl(suiteId);
      window.location.href = url;
    } catch (e: unknown) {
      setConnectionError(e instanceof Error ? e.message : "Failed to start Meta connection");
      setConnecting(false);
    }
  }

  async function connectGoogle() {
    setConnecting(true);
    setConnectionError("");
    try {
      const { url } = await api.connections.googleAuthUrl(suiteId);
      window.location.href = url;
    } catch (e: unknown) {
      setConnectionError(e instanceof Error ? e.message : "Failed to start Google Ads connection");
      setConnecting(false);
    }
  }

  async function disconnect(platform: string) {
    await api.connections.disconnect(suiteId, platform);
    const updated = await api.connections.get(suiteId);
    setConnections(updated);
  }

  async function runStorageTest() {
    setTestingStorage(true);
    setConnectionError("");
    try {
      const result = await api.suites.storageTest(suiteId);
      setStorageTest(result);
      setStorage(result);
    } catch (e: unknown) {
      setConnectionError(e instanceof Error ? e.message : "Storage test failed");
    } finally {
      setTestingStorage(false);
    }
  }

  const fb = connections.facebook;
  const ig = connections.instagram;
  const metaAds = connections.meta_ads;
  const metaConnected = !!fb?.connected;
  const googleAds = connections.google_ads;
  const indicators = [
    { label: "Meta", connected: metaConnected },
    { label: "Google", connected: !!googleAds?.connected },
    { label: "Storage", connected: !!storage?.configured },
  ];

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-white">Connections</h2>
          <p className="text-xs text-zinc-500 mt-1">Accounts used for publishing, campaigns, and analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {indicators.map((item) => (
              <span
                key={item.label}
                title={item.label}
                className={`h-2.5 w-2.5 rounded-full ${item.connected ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" : "bg-zinc-700"}`}
              />
            ))}
          </div>
          <ChevronDown size={16} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {connectionError && (
        <div className="mx-4 mb-3 rounded-lg border border-red-900/70 bg-red-950/50 px-3 py-2 text-xs text-red-200" dir="ltr">
          {connectionError}
        </div>
      )}
      {storage && !storage.configured && (
        <div className="mx-4 mb-3 rounded-lg border border-amber-900/70 bg-amber-950/40 px-3 py-2 text-xs text-amber-100" dir="ltr">
          Media storage is not public yet. Configure R2 so generated images/videos survive deploys and can be published.
          {storage.missing.length > 0 && (
            <span className="block mt-1 text-amber-300" dir="ltr">
              Missing: {storage.missing.join(", ")}
            </span>
          )}
        </div>
      )}
      {open && <div className="grid grid-cols-1 gap-3 border-t border-zinc-800 p-4 md:grid-cols-4">
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
              {metaAds?.connected && (
                <p className="text-zinc-400 text-xs flex items-center gap-1">
                  <BarChart3 size={11} /> {metaAds.ad_account_name || metaAds.ad_account_id}
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

        {/* Google Ads */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
            <BarChart3 size={15} className="text-amber-400" /> Google Ads
          </div>
          {googleAds?.connected ? (
            <>
              <div className="space-y-1">
                <p className="text-zinc-300 text-xs font-medium">{googleAds.customer_name || googleAds.customer_id}</p>
                <p className="text-zinc-500 text-xs">{googleAds.customer_id}</p>
                {googleAds.user_email && (
                  <p className="text-zinc-400 text-xs" dir="ltr">{googleAds.user_email}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => disconnect("google_ads")}
                className="w-full border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-900 gap-1 text-xs h-7"
              >
                <Link2Off size={11} /> Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={connectGoogle}
              disabled={connecting}
              className="w-full bg-amber-700 hover:bg-amber-600 gap-1 text-xs h-7"
            >
              {connecting ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
              Connect Google Ads
            </Button>
          )}
        </div>

        {/* TikTok (future) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 opacity-50">
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
            <AtSign size={15} /> TikTok
          </div>
          <p className="text-zinc-500 text-xs">Coming soon</p>
        </div>

        {/* Storage */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
              <ImageIcon size={15} className={storage?.configured ? "text-emerald-400" : "text-amber-400"} /> Media Storage
            </div>
            <span className={`w-2 h-2 rounded-full ${storage?.configured ? "bg-emerald-400" : "bg-amber-500"}`} />
          </div>
          <p className="text-zinc-400 text-xs" dir="ltr">
            {storage?.configured ? "R2 public storage is ready." : "Local fallback is active."}
          </p>
          {storageTest && (
            <p className={`text-xs ${storageTest.ok ? "text-emerald-300" : "text-amber-300"}`} dir="ltr">
              {storageTest.ok ? "Upload test passed." : storageTest.error || "Upload test failed."}
            </p>
          )}
          {!storage?.configured && (
            <p className="text-zinc-500 text-xs" dir="ltr">
              Add R2 variables to publish images and videos reliably.
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={runStorageTest}
            disabled={testingStorage}
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1 text-xs h-7"
          >
            {testingStorage ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Test storage
          </Button>
        </div>
      </div>}
    </section>
  );
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export function AnalyticsTab({ suiteId }: { suiteId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(28);

  const load = useCallback(async (d = days) => {
    setLoading(true);
    try {
      const res = await api.analytics.get(suiteId, d);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [days, suiteId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

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
    ig.insights?.reach || fb.insights?.page_impressions_unique || fb.insights?.page_reach || [];
  const impressionSeries: InsightPoint[] =
    ig.insights?.views || ig.insights?.impressions || fb.insights?.page_post_engagements || [];

  const chartData = reachSeries.map((pt, i) => ({
    date: pt.date.slice(5),   // MM-DD
    reach: pt.value,
    impressions: impressionSeries[i]?.value ?? 0,
  }));

  return (
    <div className="space-y-6">
      {data.errors && data.errors.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          <div className="font-medium mb-1">Meta analytics needs attention</div>
          <div className="space-y-1 text-amber-100/80">
            {data.errors.slice(0, 3).map((err, idx) => (
              <p key={idx} className="break-words">{err}</p>
            ))}
          </div>
        </div>
      )}

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
          value={sum(fb.insights?.page_impressions_unique || fb.insights?.page_reach) + sum(ig.insights?.reach)}
          icon="👁"
          sub={`last ${days}d`}
        />
        <StatCard
          label="Views / Engagement"
          value={sum(fb.insights?.page_post_engagements) + sum(ig.insights?.views || ig.insights?.impressions)}
          icon="📊"
          sub={`last ${days}d`}
        />
      </div>

      {/* Reach / Impressions chart */}
      {chartData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm text-zinc-400 mb-4">Reach &amp; views/engagement — last {days} days</h3>
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
              <Line type="monotone" dataKey="impressions" stroke="#818cf8" strokeWidth={1.5} dot={false} name="Views / engagement" strokeDasharray="4 2" />
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

function mediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_MEDIA}${url}`;
}

// ─── Competitors & Market Research ─────────────────────────────────────────

export function CompetitorsSection({
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

export function StrategyPanel({
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
            <div className="os-scroll-x">
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
