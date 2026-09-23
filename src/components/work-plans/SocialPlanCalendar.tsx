"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  Image as ImageIcon,
  Info,
  Layers3,
  Loader2,
  PlaySquare,
  RefreshCcw,
  Save,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { workPlanText, type WorkPlanLabels } from "@/lib/i18n/workPlans";
import {
  api,
  MarketingPlanResponse,
  Post,
  SocialContentIdea,
  SocialContentWorkPlan,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PlanType = "weekly" | "monthly";

const TYPE_DOT: Record<string, string> = {
  attraction: "bg-[#2f80ff]",
  trust: "bg-[#8b5cf6]",
  sales: "bg-[#ff4fa3]",
};

function typeMeta(text: WorkPlanLabels): Record<string, { label: string; dot: string }> {
  return {
    attraction: { label: text.goalAttraction, dot: TYPE_DOT.attraction },
    trust: { label: text.goalTrust, dot: TYPE_DOT.trust },
    sales: { label: text.goalSales, dot: TYPE_DOT.sales },
  };
}

function assetLabels(text: WorkPlanLabels): Record<string, string> {
  return {
    human_video: text.assetHumanVideo,
    location_video: text.assetLocationVideo,
    product_photos: text.assetProductPhotos,
    product_video: text.assetProductVideo,
    client_asset: text.assetClientAsset,
  };
}

function planCountBounds(planType: PlanType): { min: number; max: number; def: number } {
  return planType === "weekly" ? { min: 1, max: 14, def: 4 } : { min: 1, max: 31, def: 15 };
}

function formatIcon(format?: string, size = 13) {
  const text = (format || "").toLowerCase();
  if (text.includes("carousel")) return <Layers3 size={size} />;
  if (text.includes("reel") || text.includes("video") || text.includes("story")) return <PlaySquare size={size} />;
  return <ImageIcon size={size} />;
}

function dayLabel(dateIso: string, lang: string): { weekday: string; day: string } {
  const parsed = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return { weekday: "", day: dateIso };
  return {
    // The weekday used to come from a hard-coded Arabic array.
    weekday: new Intl.DateTimeFormat(lang || "en", { weekday: "long" }).format(parsed),
    day: `${parsed.getDate()}/${parsed.getMonth() + 1}`,
  };
}

function generationState(idea?: SocialContentIdea | null): string {
  return idea?.generation?.status || "idle";
}

export function SocialPlanCalendar({
  suiteId,
  response,
  onResponse,
}: {
  suiteId: string;
  response: MarketingPlanResponse | null;
  onResponse: (res: MarketingPlanResponse) => void;
}) {
  const { lang } = useLanguage();
  const text = workPlanText(lang);
  const plan: SocialContentWorkPlan | undefined = response?.action_plan?.social_content_plan;
  const hasSchedule = Boolean(plan?.schedule?.days?.length);

  const [planType, setPlanType] = useState<PlanType>((plan?.plan_type as PlanType) || "monthly");
  const [count, setCount] = useState<number>(plan?.monthly_posts || planCountBounds((plan?.plan_type as PlanType) || "monthly").def);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Adopt the stored plan's settings whenever a different plan arrives (adjust-during-render pattern).
  const planKey = `${plan?.generated_at || ""}-${plan?.plan_type || ""}-${plan?.monthly_posts || ""}`;
  const [prevPlanKey, setPrevPlanKey] = useState(planKey);
  if (planKey !== prevPlanKey) {
    setPrevPlanKey(planKey);
    if (plan?.plan_type === "weekly" || plan?.plan_type === "monthly") setPlanType(plan.plan_type);
    if (plan?.monthly_posts) setCount(plan.monthly_posts);
  }

  const itemById = useMemo(() => {
    const map = new Map<string, SocialContentIdea>();
    Object.values(plan?.candidates || {}).forEach((group) =>
      (group || []).forEach((item) => map.set(item.id, item))
    );
    return map;
  }, [plan?.candidates]);

  const selectedIds = useMemo(() => plan?.selected_ids || [], [plan?.selected_ids]);
  const postById = useMemo(() => new Map(posts.map((post) => [post.id, post])), [posts]);

  const pendingGeneration = useMemo(
    () =>
      selectedIds.some((id) => {
        const status = generationState(itemById.get(id));
        return status === "queued" || status === "generating";
      }),
    [selectedIds, itemById]
  );

  const refreshPosts = useCallback(() => {
    api.content.list(suiteId).then(setPosts).catch(() => undefined);
  }, [suiteId]);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  useEffect(() => {
    if (!pendingGeneration) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.marketingPlans.get(suiteId);
        onResponse(res);
        refreshPosts();
      } catch {
        /* keep polling */
      }
    }, 5000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [pendingGeneration, suiteId, onResponse, refreshPosts]);

  async function generatePlan() {
    if (hasSchedule && !window.confirm(text.replaceWarning)) return;
    setGeneratingPlan(true);
    setError("");
    setNotice("");
    try {
      const res = await api.marketingPlans.generateSocialContentPlan(suiteId, {
        monthly_posts: count,
        plan_type: planType,
      });
      onResponse(res);
      setNotice(text.planGenerated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGeneratingPlan(false);
    }
  }

  async function generateAll() {
    setBatchBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await api.marketingPlans.generateSocialContentItems(suiteId);
      onResponse(res);
      const queued = res.queued_job_ids?.length || 0;
      const needsUser = (res.skipped || []).filter((entry) => entry.reason === "user_assets_required").length;
      const parts = [`${queued} ${text.queuedForGeneration}`];
      if (needsUser) parts.push(`${needsUser} ${text.needFilming}`);
      if (res.payment_required) parts.push(text.creditsRanOut);
      setNotice(parts.join(" "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setBatchBusy(false);
    }
  }

  const bounds = planCountBounds(planType);
  const days = plan?.schedule?.days || [];
  const openItem = openItemId ? itemById.get(openItemId) || null : null;

  return (
    <section className="rounded-3xl border border-[#2f80ff]/25 bg-gradient-to-br from-[#2f80ff]/8 via-background to-[#18b89d]/6 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{text.calendarTitle}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {text.calendarIntro}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-border bg-card p-1">
            {(["weekly", "monthly"] as PlanType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setPlanType(type);
                  setCount(planCountBounds(type).def);
                }}
                className={[
                  "rounded-xl px-3 py-1.5 text-sm font-medium transition",
                  planType === type ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {type === "weekly" ? text.weekly : text.monthly}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCount(Math.max(bounds.min, count - 1))}>-</Button>
            <div className="min-w-20 text-center">
              <div className="text-xl font-semibold">{count}</div>
              <div className="text-[11px] text-muted-foreground">{planType === "weekly" ? text.postsPerWeek : text.postsPerMonth}</div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setCount(Math.min(bounds.max, count + 1))}>+</Button>
          </div>
          <Button onClick={generatePlan} disabled={generatingPlan} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
            {generatingPlan ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
            {hasSchedule ? text.newPlan : text.generatePlan}
          </Button>
          {hasSchedule && (
            <Button onClick={generateAll} disabled={batchBusy || pendingGeneration} variant="outline" className="gap-2">
              {batchBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {text.generateWholePlan}
            </Button>
          )}
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" dir="auto">{error}</div>}
      {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" dir="auto">{notice}</div>}
      {(plan?.warnings || []).map((warning) => (
        <div key={warning} className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900" dir="auto">{warning}</div>
      ))}

      {!hasSchedule && !generatingPlan && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/70 p-6 text-center text-sm leading-6 text-muted-foreground">
          {text.calendarEmpty}
        </div>
      )}

      {hasSchedule && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Sparkles size={12} className="text-[#18b89d]" /> {text.legendAi}</span>
            <span className="inline-flex items-center gap-1"><Camera size={12} className="text-amber-600" /> {text.legendNeedsYou}</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" /> {text.legendReady}</span>
            {Object.entries(typeMeta(text)).map(([key, meta]) => (
              <span key={key} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((day) => {
              const label = dayLabel(day.date, lang);
              const dayItems = (day.item_ids || []).map((id) => itemById.get(id)).filter(Boolean) as SocialContentIdea[];
              return (
                <div
                  key={day.date}
                  className={[
                    "min-h-24 rounded-2xl border p-2",
                    dayItems.length ? "border-border bg-card" : "border-border/50 bg-card/40",
                  ].join(" ")}
                >
                  <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
                    <span>{label.weekday}</span>
                    <span>{label.day}</span>
                  </div>
                  <div className="mt-1.5 space-y-1.5">
                    {dayItems.map((idea) => (
                      <IdeaChip key={idea.id} idea={idea} onClick={() => setOpenItemId(idea.id)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-center">
            <Button onClick={generateAll} disabled={batchBusy || pendingGeneration} variant="outline" className="gap-2">
              {batchBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {text.generateWholePlan}
            </Button>
          </div>
        </>
      )}

      {openItem && (() => {
        const openPost = openItem.generation?.post_id ? postById.get(openItem.generation.post_id) || null : null;
        return (
          <IdeaModal
            key={`${openItem.id}-${openPost?.id || "no-post"}`}
            suiteId={suiteId}
            idea={openItem}
            post={openPost}
            plan={plan}
            onClose={() => setOpenItemId(null)}
            onResponse={onResponse}
            onPostsRefresh={refreshPosts}
          />
        );
      })()}
    </section>
  );
}

function IdeaChip({ idea, onClick }: { idea: SocialContentIdea; onClick: () => void }) {
  const { lang } = useLanguage();
  const text = workPlanText(lang);
  const status = generationState(idea);
  const meta = typeMeta(text)[idea.type] || typeMeta(text).attraction;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-background p-2 text-start transition hover:border-[#2f80ff]/60"
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
        {formatIcon(idea.format)}
        {idea.ai_capability === "user_required" ? (
          <Camera size={13} className="text-amber-600" />
        ) : idea.ai_capability === "user_recommended" ? (
          <Camera size={13} className="text-muted-foreground" />
        ) : (
          <Sparkles size={13} className="text-[#18b89d]" />
        )}
        <span className="ms-auto">
          {status === "ready" && <CheckCircle2 size={13} className="text-emerald-600" />}
          {(status === "queued" || status === "generating") && <Loader2 size={13} className="animate-spin text-[#2f80ff]" />}
          {status === "failed" && <AlertTriangle size={13} className="text-red-600" />}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-medium leading-4" dir="auto">{idea.title}</p>
    </button>
  );
}

function IdeaModal({
  suiteId,
  idea,
  post,
  plan,
  onClose,
  onResponse,
  onPostsRefresh,
}: {
  suiteId: string;
  idea: SocialContentIdea;
  post: Post | null;
  plan?: SocialContentWorkPlan;
  onClose: () => void;
  onResponse: (res: MarketingPlanResponse) => void;
  onPostsRefresh: () => void;
}) {
  // The parent remounts this modal via `key` when the idea/post identity changes,
  // so initializing state from props here is safe.
  const { lang } = useLanguage();
  const text = workPlanText(lang);
  const [title, setTitle] = useState(idea.title || "");
  const [ideaText, setIdeaText] = useState(idea.idea || "");
  const [script, setScript] = useState(idea.script || "");
  const [cta, setCta] = useState(idea.cta || "");
  const [caption, setCaption] = useState(post?.caption || "");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showIntervention, setShowIntervention] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const status = generationState(idea);
  const dirty = title !== (idea.title || "") || ideaText !== (idea.idea || "") || script !== (idea.script || "") || cta !== (idea.cta || "");
  const capability = idea.ai_capability || "ai";
  const alternatives = useMemo(() => {
    const selected = new Set(plan?.selected_ids || []);
    return (plan?.candidates?.[idea.type] || []).filter((candidate) => !selected.has(candidate.id));
  }, [plan?.candidates, plan?.selected_ids, idea.type]);

  async function saveEdits() {
    setBusy("save");
    setMessage("");
    try {
      const res = await api.marketingPlans.updateSocialContentItem(suiteId, idea.id, {
        title,
        idea: ideaText,
        script,
        cta,
      });
      onResponse(res);
      setMessage(text.changesSaved);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setBusy("generate");
    setMessage("");
    try {
      await api.marketingPlans.generateSocialContentItem(suiteId, idea.id);
      const res = await api.marketingPlans.get(suiteId);
      onResponse(res);
      setMessage(text.queuedOne);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setBusy(null);
    }
  }

  async function swapTo(candidateId: string) {
    setBusy(`swap-${candidateId}`);
    setMessage("");
    try {
      const nextIds = (plan?.selected_ids || []).map((id) => (id === idea.id ? candidateId : id));
      const res = await api.marketingPlans.updateSocialContentPlanSelection(suiteId, nextIds);
      onResponse(res);
      onClose();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Swap failed");
      setBusy(null);
    }
  }

  async function saveCaption() {
    if (!post) return;
    setBusy("caption");
    setMessage("");
    try {
      await api.content.update(suiteId, post.id, { caption });
      onPostsRefresh();
      setMessage(text.captionSaved);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(text.copied);
    } catch {
      setMessage(text.copyFailed);
    }
  }

  const mediaUrls = (post?.media_public_urls?.length ? post.media_public_urls : post?.media_urls) || [];
  const hashtags = post?.hashtags || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-background p-4 sm:max-w-2xl sm:rounded-3xl sm:p-6"
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              {formatIcon(idea.format)}
              {idea.format || "post"}
            </Badge>
            <Badge variant="outline">{typeMeta(text)[idea.type]?.label || idea.type}</Badge>
            {idea.scheduled_date && <Badge variant="outline">{dayLabel(idea.scheduled_date, lang).weekday} {dayLabel(idea.scheduled_date, lang).day}</Badge>}
            {capability === "ai" && <Badge className="gap-1 bg-[#18b89d] text-white"><Sparkles size={12} /> AI</Badge>}
            {capability === "user_recommended" && <Badge variant="outline" className="gap-1 text-amber-700"><Camera size={12} /> {text.recommendedForYou}</Badge>}
            {capability === "user_required" && <Badge className="gap-1 bg-amber-500 text-white"><Camera size={12} /> {text.legendNeedsYou}</Badge>}
            {(capability !== "ai" || idea.user_intervention) && (
              <button
                type="button"
                onClick={() => setShowIntervention((current) => !current)}
                className="rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label={text.whatIsAskedOfMe}
                title={text.whatIsAskedOfMe}
              >
                <Info size={15} />
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={text.close}>
            <X size={18} />
          </button>
        </div>

        {showIntervention && idea.user_intervention && (
          <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">{idea.user_intervention.label}</p>
            {idea.user_intervention.instructions && <p className="mt-1 leading-6" dir="auto">{idea.user_intervention.instructions}</p>}
            {(idea.user_intervention.required_assets || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(idea.user_intervention.required_assets || []).map((asset) => (
                  <Badge key={asset} variant="outline" className="border-amber-400 text-amber-800">{assetLabels(text)[asset] || asset}</Badge>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-amber-700">{text.uploadSoon}</p>
          </div>
        )}

        {message && <div className="mt-3 rounded-xl border border-border bg-muted/50 p-2 text-xs" dir="auto">{message}</div>}

        <div className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">{text.theIdea}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              dir="auto"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">{text.ideaDescription}</span>
            <textarea
              value={ideaText}
              onChange={(event) => setIdeaText(event.target.value)}
              rows={2}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              dir="auto"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">{text.suggestedCopy}</span>
            <textarea
              value={script}
              onChange={(event) => setScript(event.target.value)}
              rows={6}
              className="w-full resize-y rounded-md border border-input bg-muted/40 px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              dir="auto"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">{text.callToAction}</span>
            <input
              value={cta}
              onChange={(event) => setCta(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              dir="auto"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {dirty && (
            <Button onClick={saveEdits} disabled={busy === "save"} variant="outline" className="gap-2">
              {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {text.saveChanges}
            </Button>
          )}
          {capability !== "user_required" && status !== "ready" && (
            <Button onClick={generate} disabled={busy === "generate" || status === "queued" || status === "generating"} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
              {busy === "generate" || status === "queued" || status === "generating" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {status === "queued" || status === "generating"
                ? text.generatingIdea
                : status === "failed"
                  ? text.retryGeneration
                  : capability === "user_recommended"
                    ? text.generateAnyway
                    : text.generateIdea}
            </Button>
          )}
          {status === "ready" && (
            <Button onClick={generate} disabled={busy === "generate"} variant="outline" className="gap-2">
              {busy === "generate" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              {text.regenerateIdea}
            </Button>
          )}
          {alternatives.length > 0 && (
            <Button onClick={() => setShowAlternatives((current) => !current)} variant="ghost" className="gap-2">
              <RefreshCcw size={14} />
              {text.replaceIdea} ({alternatives.length})
            </Button>
          )}
        </div>

        {status === "failed" && idea.generation?.error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" dir="auto">{idea.generation.error}</div>
        )}

        {showAlternatives && (
          <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card/60 p-3">
            <p className="text-xs font-semibold text-muted-foreground">{text.alternativesNote}</p>
            {alternatives.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => swapTo(candidate.id)}
                disabled={busy === `swap-${candidate.id}`}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background p-2 text-start text-sm transition hover:border-[#2f80ff]/60"
              >
                <span className="line-clamp-2" dir="auto">{candidate.title}</span>
                {busy === `swap-${candidate.id}` ? <Loader2 size={14} className="shrink-0 animate-spin" /> : <Badge variant="outline">{candidate.provider}</Badge>}
              </button>
            ))}
          </div>
        )}

        {status === "ready" && post && (
          <div className="mt-5 space-y-3 rounded-2xl border border-emerald-300/60 bg-emerald-50/40 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={16} /> {text.postReady}
            </p>

            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mediaUrls.map((url) =>
                  post.format === "video" ? (
                    <video key={url} src={url} controls className="max-h-64 w-full rounded-xl border border-border bg-black" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" className="h-32 w-32 rounded-xl border border-border object-cover" />
                  )
                )}
                <div className="flex w-full flex-wrap gap-2">
                  {mediaUrls.map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium transition hover:bg-accent"
                    >
                      <Download size={13} />
                      {text.download} {post.format === "video" ? text.theVideo : mediaUrls.length > 1 ? `${text.imageN} ${index + 1}` : text.theImage}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">{text.caption}</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={6}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                dir="auto"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveCaption} disabled={busy === "caption" || caption === (post.caption || "")} variant="outline" size="sm" className="gap-1.5">
                {busy === "caption" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {text.saveCaption}
              </Button>
              <Button onClick={() => copyText([caption, hashtags.join(" ")].filter(Boolean).join("\n\n"))} variant="outline" size="sm" className="gap-1.5">
                <Copy size={13} />
                {text.copyCaption}
              </Button>
            </div>
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" dir="auto">{tag.startsWith("#") ? tag : `#${tag}`}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {status === "ready" && !post && (
          <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {text.postGeneratedFetching}
          </div>
        )}
      </div>
    </div>
  );
}
