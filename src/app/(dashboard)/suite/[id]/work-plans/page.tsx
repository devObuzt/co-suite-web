"use client";

import { use, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, BadgeCheck, CheckCircle2, Loader2, Megaphone, Save, Sparkles, Target } from "lucide-react";
import { api, MarketingActionItem, MarketingPlanResponse, SocialContentIdea, SocialContentWorkPlan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Mode = "social" | "paid";
type ContentType = "attraction" | "trust" | "sales";

const typeCopy: Record<ContentType, { title: string; share: string; tone: string }> = {
  attraction: {
    title: "جذب المتابعين والمشاهدات",
    share: "70%",
    tone: "from-[#2f80ff]/14 to-[#18b89d]/8",
  },
  trust: {
    title: "بناء الثقة والهوية",
    share: "20%",
    tone: "from-[#8b5cf6]/14 to-[#2f80ff]/8",
  },
  sales: {
    title: "زيادة المبيعات",
    share: "10%",
    tone: "from-[#ff4fa3]/14 to-[#f8d84a]/10",
  },
};

function itemsFor(plan: SocialContentWorkPlan | undefined, type: ContentType) {
  return plan?.candidates?.[type] || [];
}

function requiredFor(plan: SocialContentWorkPlan | undefined, type: ContentType) {
  return plan?.content_mix?.find((item) => item.type === type)?.required_count || 0;
}

export default function WorkPlansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, dir } = useLanguage();
  const [mode, setMode] = useState<Mode>("social");
  const [response, setResponse] = useState<MarketingPlanResponse | null>(null);
  const [monthlyPosts, setMonthlyPosts] = useState(15);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Mode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.marketingPlans.get(id)
      .then((res) => {
        setResponse(res);
        const plan = res.action_plan?.social_content_plan;
        setMonthlyPosts(plan?.monthly_posts || 15);
        setSelectedIds(plan?.selected_ids || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [id]);

  const socialPlan = response?.action_plan?.social_content_plan;
  const paidItems = response?.action_plan?.ad_funnel_items || [];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedByType = useMemo(() => {
    const map: Record<ContentType, number> = { attraction: 0, trust: 0, sales: 0 };
    (["attraction", "trust", "sales"] as ContentType[]).forEach((type) => {
      map[type] = itemsFor(socialPlan, type).filter((item) => selectedSet.has(item.id)).length;
    });
    return map;
  }, [selectedSet, socialPlan]);

  async function generateSocialPlan() {
    setGenerating("social");
    setError("");
    setNotice("");
    try {
      const res = await api.marketingPlans.generateSocialContentPlan(id, {
        language: lang,
        monthly_posts: monthlyPosts,
      });
      setResponse(res);
      const next = res.action_plan?.social_content_plan;
      setSelectedIds(next?.selected_ids || []);
      setNotice("تم توليد مرشحين لخطة السوشيال. اختر الأفكار المطلوبة واحفظ.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(null);
    }
  }

  async function generatePaidPlan() {
    setGenerating("paid");
    setError("");
    setNotice("");
    try {
      const res = await api.marketingPlans.generatePaidFunnel(id, { language: lang });
      setResponse(res);
      setNotice("تم توليد خطة التسويق الممول.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(null);
    }
  }

  async function saveSelection() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await api.marketingPlans.updateSocialContentPlanSelection(id, selectedIds);
      setResponse(res);
      setSelectedIds(res.action_plan?.social_content_plan?.selected_ids || selectedIds);
      setNotice("تم حفظ اختيارات خطة السوشيال.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleIdea(idea: SocialContentIdea, type: ContentType) {
    setSelectedIds((current) => {
      if (current.includes(idea.id)) return current.filter((id) => id !== idea.id);
      const required = requiredFor(socialPlan, type);
      const currentForType = itemsFor(socialPlan, type).filter((item) => current.includes(item.id));
      if (required && currentForType.length >= required) return current;
      return [...current, idea.id];
    });
  }

  return (
    <SuitePageShell title="الاستراتيجية">
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-4" dir={dir}>
        <header className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">خطط العمل المولدة</p>
          <h1 className="text-3xl font-semibold tracking-normal">خطة العمل</h1>
        </header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div>}

        <section className="grid gap-3 sm:grid-cols-2">
          <ModeButton
            active={mode === "social"}
            title="خطة محتوى للسوشيال ميديا"
            description="أفكار ريلز وبوستات موزعة بين جذب، ثقة، ومبيعات."
            icon={<Sparkles size={22} />}
            onClick={() => setMode("social")}
          />
          <ModeButton
            active={mode === "paid"}
            title="خطة محتوى للتسويق الممول"
            description="أفكار إعلانات حسب مراحل الوعي، التفكير، والتحويل."
            icon={<Megaphone size={22} />}
            onClick={() => setMode("paid")}
          />
        </section>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">جار تحميل خطة العمل...</div>
        ) : mode === "social" ? (
          <SocialPlanPanel
            plan={socialPlan}
            monthlyPosts={monthlyPosts}
            selectedSet={selectedSet}
            selectedByType={selectedByType}
            generating={generating === "social"}
            saving={saving}
            onMonthlyPostsChange={setMonthlyPosts}
            onGenerate={generateSocialPlan}
            onSave={saveSelection}
            onToggleIdea={toggleIdea}
          />
        ) : (
          <PaidPlanPanel items={paidItems} generating={generating === "paid"} onGenerate={generatePaidPlan} />
        )}
      </div>
    </SuitePageShell>
  );
}

function ModeButton({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-[20vh] rounded-3xl border p-5 text-start shadow-sm transition",
        active
          ? "border-[#2f80ff] bg-gradient-to-br from-[#2f80ff]/14 via-[#18b89d]/8 to-transparent"
          : "border-border bg-card hover:border-[#2f80ff]/50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={["rounded-2xl p-3", active ? "bg-[#2f80ff] text-white" : "bg-muted text-foreground"].join(" ")}>
          {icon}
        </span>
        {active && <CheckCircle2 size={20} className="text-[#18b89d]" />}
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-normal">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </button>
  );
}

function SocialPlanPanel({
  plan,
  monthlyPosts,
  selectedSet,
  selectedByType,
  generating,
  saving,
  onMonthlyPostsChange,
  onGenerate,
  onSave,
  onToggleIdea,
}: {
  plan?: SocialContentWorkPlan;
  monthlyPosts: number;
  selectedSet: Set<string>;
  selectedByType: Record<ContentType, number>;
  generating: boolean;
  saving: boolean;
  onMonthlyPostsChange: (value: number) => void;
  onGenerate: () => void;
  onSave: () => void;
  onToggleIdea: (idea: SocialContentIdea, type: ContentType) => void;
}) {
  const hasPlan = Boolean(plan?.candidates && Object.values(plan.candidates).some((items) => items.length > 0));

  return (
    <section className="rounded-3xl border border-[#2f80ff]/25 bg-gradient-to-br from-[#2f80ff]/8 via-background to-[#18b89d]/6 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">خطة محتوى السوشيال ميديا</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            نوصي كبداية بنشر بوست كل يومين تقريبًا. بعد التوليد اختر العدد المطلوب من كل نوع محتوى.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onMonthlyPostsChange(Math.max(1, monthlyPosts - 1))}>-</Button>
            <div className="min-w-24 text-center">
              <div className="text-xl font-semibold">{monthlyPosts}</div>
              <div className="text-[11px] text-muted-foreground">بوست/شهر</div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onMonthlyPostsChange(Math.min(31, monthlyPosts + 1))}>+</Button>
          </div>
          <Button onClick={onGenerate} disabled={generating} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
            {hasPlan ? "توليد من جديد" : "توليد الخطة"}
          </Button>
          {hasPlan && (
            <Button onClick={onSave} disabled={saving} variant="outline" className="gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ الاختيارات
            </Button>
          )}
        </div>
      </div>

      {!hasPlan && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/70 p-6 text-center text-sm leading-6 text-muted-foreground">
          لا توجد خطة سوشيال بعد. اختر الوتيرة ثم اضغط توليد الخطة.
        </div>
      )}

      {hasPlan && (
        <div className="mt-6 space-y-5">
          {(plan?.warnings || []).map((warning) => (
            <div key={warning} className="rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900" dir="auto">{warning}</div>
          ))}
          {(["attraction", "trust", "sales"] as ContentType[]).map((type) => {
            const required = requiredFor(plan, type);
            const selected = selectedByType[type];
            return (
              <section key={type} className={`rounded-3xl border border-border bg-gradient-to-br ${typeCopy[type].tone} p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">{typeCopy[type].title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{typeCopy[type].share} من المحتوى · اختر {required} من {itemsFor(plan, type).length}</p>
                  </div>
                  <Badge variant={selected === required ? "default" : "outline"}>{selected}/{required}</Badge>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {itemsFor(plan, type).map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      selected={selectedSet.has(idea.id)}
                      disabled={!selectedSet.has(idea.id) && required > 0 && selected >= required}
                      onClick={() => onToggleIdea(idea, type)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function IdeaCard({ idea, selected, disabled, onClick }: { idea: SocialContentIdea; selected: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-2xl border bg-card p-4 text-start transition",
        selected ? "border-[#18b89d] shadow-sm ring-2 ring-[#18b89d]/20" : "border-border hover:border-[#2f80ff]/50",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {idea.format && <Badge variant="secondary">{idea.format}</Badge>}
            {idea.provider && <Badge variant="outline">{idea.provider}</Badge>}
          </div>
          <h4 className="mt-3 text-lg font-semibold leading-7" dir="auto">{idea.title}</h4>
        </div>
        {selected && <BadgeCheck size={20} className="shrink-0 text-[#18b89d]" />}
      </div>
      {idea.idea && <p className="mt-3 text-sm leading-6 text-muted-foreground" dir="auto">{idea.idea}</p>}
      {idea.script && <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm leading-6" dir="auto">{idea.script}</p>}
      {idea.cta && <p className="mt-3 text-xs font-semibold text-muted-foreground" dir="auto">{idea.cta}</p>}
    </button>
  );
}

function PaidPlanPanel({ items, generating, onGenerate }: { items: MarketingActionItem[]; generating: boolean; onGenerate: () => void }) {
  return (
    <section className="rounded-3xl border border-[#ff4fa3]/25 bg-gradient-to-br from-[#ff4fa3]/8 via-background to-[#f8d84a]/10 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">خطة محتوى للتسويق الممول</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">أفكار محتوى إعلاني حسب مراحل القمع التسويقي.</p>
        </div>
        <Button onClick={onGenerate} disabled={generating} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
          {items.length ? "توليد من جديد" : "توليد الخطة"}
        </Button>
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
            لا توجد خطة للتسويق الممول بعد.
          </div>
        )}
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                {item.funnel_stage && <Badge variant="secondary">{item.funnel_stage}</Badge>}
                <h3 className="mt-3 text-lg font-semibold" dir="auto">{item.title}</h3>
              </div>
              <ArrowUpRight size={18} className="text-muted-foreground" />
            </div>
            {item.generation_prompt && <p className="mt-3 text-sm leading-6 text-muted-foreground" dir="auto">{item.generation_prompt}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
