"use client";

import { useMemo, useState } from "react";
import {
  api,
  type MarketingPlanResponse,
  type SocialIdea,
  type SocialIdeaObjective,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Loader2, Plus, Sparkles } from "lucide-react";

const OBJECTIVE: Record<SocialIdeaObjective, { label: string; dot: string }> = {
  attraction: { label: "جذب", dot: "#2f80ff" },
  trust: { label: "ثقة", dot: "#18b89d" },
  sales: { label: "مبيعات", dot: "#ff4fa3" },
};

const ASSET_LABELS: Record<string, string> = {
  ugc: "يو جي سي",
  talking_head: "فيديو شخص يحكي",
  image: "صورة",
  banner: "بانر",
  carousel: "كاروسيل",
  ai_video: "فيديو AI",
  landing_page: "صفحة هبوط",
  webinar: "ويبنار",
  website: "موقع",
  app: "تطبيق",
  digital_asset_other: "أصل رقمي آخر",
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "attraction", label: "جذب" },
  { key: "trust", label: "ثقة" },
  { key: "sales", label: "مبيعات" },
  { key: "occasions", label: "مناسبات" },
];

function nextMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function assetLabel(type: string): string {
  return ASSET_LABELS[type] ?? type;
}

export function SocialIdeasGallery({
  suiteId,
  response,
  onResponse,
}: {
  suiteId: string;
  response: MarketingPlanResponse | null;
  onResponse: (res: MarketingPlanResponse) => void;
}) {
  const plan = response?.action_plan?.social_ideas_plan;
  const candidates = useMemo(() => plan?.candidates ?? [], [plan]);
  const target = plan?.target_count ?? 12;

  const [period, setPeriod] = useState(plan?.period ?? nextMonth());
  const [targetCount, setTargetCount] = useState(target);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [assets, setAssets] = useState<Record<string, string[]>>({});

  // Re-seed editable state whenever a fresh plan arrives (generate/reload). This
  // is the React-sanctioned "reset state when a prop changes" pattern — a
  // conditional setState during render, keyed on a signature of the candidates.
  const signature = `${plan?.period ?? ""}:${candidates.map((c) => c.id).join(",")}`;
  const [seeded, setSeeded] = useState<string | null>(null);
  if (seeded !== signature) {
    setSeeded(signature);
    setSelected(new Set(candidates.filter((c) => c.selected).map((c) => c.id)));
    setNotes(Object.fromEntries(candidates.map((c) => [c.id, c.user_notes ?? ""])));
    setAssets(
      Object.fromEntries(
        candidates.map((c) => [c.id, c.apply_assets.filter((a) => a.recommended).map((a) => a.asset_type)]),
      ),
    );
    if (plan?.period) setPeriod(plan.period);
    if (plan?.target_count) setTargetCount(plan.target_count);
  }

  const visible = useMemo(() => {
    if (filter === "all") return candidates;
    if (filter === "occasions") return candidates.filter((c) => c.occasion_ref);
    return candidates.filter((c) => c.objective_type === filter);
  }, [candidates, filter]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.marketingPlans.generateSocialIdeas(suiteId, {
        period,
        target_count: targetCount,
      });
      onResponse(res);
      setFilter("all");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر توليد الأفكار");
    } finally {
      setBusy(false);
    }
  }

  async function saveSelection() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.marketingPlans.updateSocialIdeasSelection(suiteId, {
        selected_ids: [...selected],
        notes,
        assets,
      });
      onResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حفظ الاختيار");
    } finally {
      setSaving(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAsset(ideaId: string, assetType: string) {
    setAssets((prev) => {
      const current = new Set(prev[ideaId] ?? []);
      if (current.has(assetType)) current.delete(assetType);
      else current.add(assetType);
      return { ...prev, [ideaId]: [...current] };
    });
  }

  // ── Empty state: generate ──────────────────────────────────────────────
  if (candidates.length === 0) {
    return (
      <div dir="rtl" className="space-y-4 text-right">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h3 className="text-lg font-semibold">أفكار السوشيال</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            بنفحص المناسبات وأبحاث السوق، وبنقترح ضعف العدد أفكار — إنت بتختار.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">الشهر</span>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">عدد الأفكار (الوتيرة)</span>
              <input
                type="number"
                min={1}
                max={31}
                value={targetCount}
                onChange={(e) => setTargetCount(Math.max(1, Math.min(31, Number(e.target.value) || 12)))}
                className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <Button onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {busy ? "عم نولّد…" : "ولّد أفكار"}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Gallery ────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="space-y-3 text-right">
      {/* Sticky counter + save */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-2 rounded-xl border border-border bg-card/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">أفكار {plan?.period}</span>
          <Badge variant="secondary">
            اخترت {selected.size} / {target}
          </Badge>
        </div>
        <Button size="sm" onClick={saveSelection} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "حفظ الاختيار"}
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              filter === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Feed */}
      <div className="space-y-2.5">
        {visible.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            selected={selected.has(idea.id)}
            chosenAssets={assets[idea.id] ?? []}
            note={notes[idea.id] ?? ""}
            onToggleSelect={() => toggleSelected(idea.id)}
            onToggleAsset={(t) => toggleAsset(idea.id, t)}
            onNote={(v) => setNotes((prev) => ({ ...prev, [idea.id]: v }))}
          />
        ))}
      </div>

      <div className="pt-1">
        <Button variant="outline" size="sm" onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          إعادة توليد
        </Button>
      </div>
    </div>
  );
}

function IdeaCard({
  idea,
  selected,
  chosenAssets,
  note,
  onToggleSelect,
  onToggleAsset,
  onNote,
}: {
  idea: SocialIdea;
  selected: boolean;
  chosenAssets: string[];
  note: string;
  onToggleSelect: () => void;
  onToggleAsset: (assetType: string) => void;
  onNote: (value: string) => void;
}) {
  const obj = OBJECTIVE[idea.objective_type];
  return (
    <div
      className={`rounded-2xl border bg-card p-3.5 transition ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="gap-1">
              <span className="size-2 rounded-full" style={{ background: obj.dot }} />
              {obj.label}
            </Badge>
            {idea.occasion_ref && (
              <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
                {idea.occasion_ref.title}
              </Badge>
            )}
          </div>
          <h4 className="font-semibold leading-snug" dir="auto">
            {idea.title}
          </h4>
          <p className="mt-0.5 text-sm text-muted-foreground" dir="auto">
            {idea.short_description}
          </p>
        </div>
        <button
          onClick={onToggleSelect}
          className={`flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary/40 text-primary hover:bg-primary/10"
          }`}
        >
          {selected ? <BadgeCheck className="size-4" /> : <Plus className="size-4" />}
          {selected ? "مضافة" : "أضف الفكرة"}
        </button>
      </div>

      {/* Always-visible detail: client story, how-to-apply assets, notes */}
      <div className="mt-3 space-y-3 border-t border-dashed border-border pt-3">
        {(idea.client_story.text || idea.client_story.example) && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              قصة عميل — مثال توضيحي حالياً
            </div>
            {idea.client_story.text && (
              <p className="mt-1 text-sm" dir="auto">
                {idea.client_story.text}
              </p>
            )}
            {idea.client_story.example && (
              <p className="mt-0.5 text-sm text-muted-foreground" dir="auto">
                {idea.client_story.example}
              </p>
            )}
          </div>
        )}

        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            كيفية التطبيق — المقترح (الوسط) مختار مسبقاً
          </div>
          <div className="flex flex-wrap gap-1.5">
            {idea.apply_assets.map((a) => {
              const on = chosenAssets.includes(a.asset_type);
              return (
                <button
                  key={a.asset_type}
                  onClick={() => onToggleAsset(a.asset_type)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    on
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {on ? "✓ " : "+ "}
                  {assetLabel(a.asset_type)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">ملاحظاتك</div>
          <textarea
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder="دوّن ملاحظاتك على الفكرة…"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            dir="auto"
          />
        </div>
      </div>
    </div>
  );
}
