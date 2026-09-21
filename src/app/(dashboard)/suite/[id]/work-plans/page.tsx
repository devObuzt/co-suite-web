"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BadgeCheck, CheckCircle2, Image, Layers3, Loader2, Megaphone, PlaySquare, Save, Sparkles } from "lucide-react";
import { api, ContentRule, MarketingPlanResponse, PaidContentIdea, PaidContentWorkPlan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { SocialIdeasGallery, nextMonth } from "@/components/work-plans/SocialIdeasGallery";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useRouter } from "next/navigation";

function paidItemsFor(plan: PaidContentWorkPlan | undefined, stage: string) {
  return plan?.candidates?.[stage] || [];
}

function paidRequiredFor(plan: PaidContentWorkPlan | undefined, stage: string) {
  return plan?.stages?.find((item) => item.key === stage)?.required_count || 1;
}

export default function WorkPlansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, dir } = useLanguage();
  const router = useRouter();
  // Both sections render stacked now. The two tabs read as a choice between
  // them, so people generated one, pressed Next, and left the other empty.
  const saveIdeasRef = useRef<(() => Promise<void>) | null>(null);
  const [response, setResponse] = useState<MarketingPlanResponse | null>(null);
  const [selectedPaidIds, setSelectedPaidIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingRun, setStartingRun] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.marketingPlans.get(id)
      .then((res) => {
        setResponse(res);
        setSelectedPaidIds(res.action_plan?.paid_content_plan?.selected_ids || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [id]);

  const paidPlan = response?.action_plan?.paid_content_plan;
  const ideasPlan = response?.action_plan?.social_ideas_plan;
  const paidGenerating = paidPlan?.status === "generating";
  const ideasGenerating = ideasPlan?.status === "generating";
  const anyGenerating = paidGenerating || ideasGenerating || startingRun;
  // "Started" covers a run in flight as well as finished output, so a reload
  // mid-run comes back to the progress view rather than the start card.
  const anyPlanStarted = Boolean(
    anyGenerating ||
      ideasPlan?.candidates?.length ||
      (paidPlan?.candidates && Object.values(paidPlan.candidates).some((g) => g.length > 0)),
  );
  const runLabel = ideasGenerating && paidGenerating
    ? "عم نجهّز أفكار السوشيال والإعلانات مع بعض…"
    : ideasGenerating
      ? "عم نجهّز أفكار السوشيال…"
      : paidGenerating
        ? "عم نسأل مزوّدَين لأفكار الإعلانات…"
        : "عم نبلّش…";

  // Resumes on any later visit: the flag lives on the server blob, not in
  // component state, so reopening the page picks a running job back up.
  useEffect(() => {
    if (!paidGenerating) return;
    const timer = window.setInterval(() => {
      api.marketingPlans
        .get(id)
        .then((res) => {
          setResponse(res);
          const next = res.action_plan?.paid_content_plan;
          if (next?.status === "ready") {
            setSelectedPaidIds(next.selected_ids || []);
            setNotice("تم توليد مرشحين لخطة التسويق الممول. اختر فكرة من كل مرحلة واحفظ.");
          }
        })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [paidGenerating, id]);
  const selectedPaidSet = useMemo(() => new Set(selectedPaidIds), [selectedPaidIds]);
  const selectedPaidByStage = useMemo(() => {
    const map: Record<string, number> = {};
    (paidPlan?.stages || []).forEach((stage) => {
      map[stage.key] = paidItemsFor(paidPlan, stage.key).filter((item) => selectedPaidSet.has(item.id)).length;
    });
    return map;
  }, [paidPlan, selectedPaidSet]);

  // Both generations are durable server jobs and nothing depends on the other,
  // so start them together. Sequentially the user waited ~56s then ~23s; in
  // parallel the wait is the longer of the two.
  async function generateWorkPlan() {
    setStartingRun(true);
    setError("");
    setNotice("");
    const results = await Promise.allSettled([
      api.marketingPlans.generateSocialIdeas(id, {
        period: nextMonth(),
        target_count: 12,
        language: lang,
      }),
      api.marketingPlans.generatePaidContentPlan(id, { language: lang }),
    ]);
    if (results.every((r) => r.status === "rejected")) {
      setError("تعذّر بدء التوليد. جرّب كمان مرة.");
    }
    try {
      setResponse(await api.marketingPlans.get(id));
    } catch {
      /* the pollers pick it up */
    }
    setStartingRun(false);
  }

  // One Next: save both selections, then move on. Nothing is mandatory — the
  // server preselects a balanced default for each, so a hurried visitor can
  // accept and continue without choosing anything.
  async function saveAllAndContinue() {
    setSaving(true);
    setError("");
    try {
      await Promise.all([
        saveIdeasRef.current ? saveIdeasRef.current() : Promise.resolve(),
        paidPlan?.candidates
          ? api.marketingPlans.updatePaidContentPlanSelection(id, selectedPaidIds)
          : Promise.resolve(),
      ]);
      router.push("/startbyconnec/services");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  async function savePaidSelection() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await api.marketingPlans.updatePaidContentPlanSelection(id, selectedPaidIds);
      setResponse(res);
      setSelectedPaidIds(res.action_plan?.paid_content_plan?.selected_ids || selectedPaidIds);
      setNotice("تم حفظ اختيارات خطة التسويق الممول.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function togglePaidIdea(idea: PaidContentIdea, stage: string) {
    setSelectedPaidIds((current) => {
      if (current.includes(idea.id)) return current.filter((id) => id !== idea.id);
      const required = paidRequiredFor(paidPlan, stage);
      const currentForStage = paidItemsFor(paidPlan, stage).filter((item) => current.includes(item.id));
      if (required && currentForStage.length >= required) return current;
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

        <TeachRulesBox suiteId={id} />

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">جار تحميل خطة العمل...</div>
        ) : !anyPlanStarted ? (
          /* One button starts both runs. No month or count to decide: the
             defaults are next month and 12 ideas, editable afterwards. */
          <div className="rounded-3xl border border-border bg-card p-6 text-center">
            <h2 className="text-xl font-bold">نجهّزلك خطة العمل؟</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              بنولّد أفكار السوشيال وأفكار الإعلانات مع بعض، وبنختارلك أفضلها. بتقدر تغيّر أي إشي بعدين.
            </p>
            <Button
              onClick={generateWorkPlan}
              disabled={startingRun}
              className="mt-5 h-12 gap-2 bg-foreground px-6 text-base font-bold text-background hover:bg-foreground/90"
            >
              {startingRun ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              جهّز خطة العمل
            </Button>
          </div>
        ) : (
          <>
            {anyGenerating && (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-semibold">{runLabel}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    التوليد شغال عالسيرفر — فيك تتنقل أو تسكّر التطبيق وترجع، ما رح يقف.
                  </p>
                </div>
              </div>
            )}

            <SocialIdeasGallery
              suiteId={id}
              response={response}
              onResponse={setResponse}
              hideStartCard
              hideSaveBar
              saveHandle={saveIdeasRef}
            />

            <PaidPlanPanel
              plan={paidPlan}
              selectedSet={selectedPaidSet}
              selectedByStage={selectedPaidByStage}
              generating={paidGenerating}
              saving={saving}
              onGenerate={generateWorkPlan}
              onSave={savePaidSelection}
              onToggleIdea={togglePaidIdea}
              hideOwnActions
            />

            {/* The single Next. Nothing above it is mandatory. */}
            <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
              <Button
                onClick={saveAllAndContinue}
                disabled={saving || anyGenerating}
                className="h-12 w-full gap-2 bg-foreground text-base font-bold text-background hover:bg-foreground/90"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {anyGenerating ? "عم نجهّز…" : "حفظ ومتابعة"}
              </Button>
            </div>
          </>
        )}
      </div>
    </SuitePageShell>
  );
}

function PaidPlanPanel({
  plan,
  selectedSet,
  selectedByStage,
  generating,
  saving,
  onGenerate,
  onSave,
  onToggleIdea,
  hideOwnActions = false,
}: {
  plan?: PaidContentWorkPlan;
  selectedSet: Set<string>;
  selectedByStage: Record<string, number>;
  generating: boolean;
  saving: boolean;
  onGenerate: () => void;
  onSave: () => void;
  hideOwnActions?: boolean;
  onToggleIdea: (idea: PaidContentIdea, stage: string) => void;
}) {
  const hasPlan = Boolean(plan?.candidates && Object.values(plan.candidates).some((items) => items.length > 0));
  return (
    <section className="rounded-3xl border border-[#ff4fa3]/25 bg-gradient-to-br from-[#ff4fa3]/8 via-background to-[#f8d84a]/10 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">خطة محتوى للتسويق الممول</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            أفكار إعلانية حسب القناة والمرحلة: وعي، اهتمام، تحويل، ولاء، وتوصية. اختر فكرة واحدة من كل مرحلة.
          </p>
        </div>
        {/* The page owns a single generate and a single Next, so these only
            appear when this panel is used on its own. */}
        {!hideOwnActions && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={onGenerate} disabled={generating} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
              {hasPlan ? "توليد من جديد" : "توليد الخطة"}
            </Button>
            {hasPlan && (
              <Button onClick={onSave} disabled={saving} variant="outline" className="gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                حفظ الاختيارات
              </Button>
            )}
          </div>
        )}
      </div>
      {!hasPlan && generating && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-4">
          <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
          <div>
            <p className="text-sm font-semibold">عم نسأل مزوّدَين ونجمع الأفكار…</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              التوليد شغال عالسيرفر — فيك تتنقل أو تسكّر التطبيق وترجع، ما رح يقف.
            </p>
          </div>
        </div>
      )}

      {!hasPlan && !generating && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
          لا توجد خطة للتسويق الممول بعد. اضغط توليد الخطة لاقتراح أفكار لكل مرحلة.
        </div>
      )}

      {hasPlan && (
        <div className="mt-6 space-y-5">
          {(plan?.warnings || []).map((warning) => (
            <div key={warning} className="rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900" dir="auto">{warning}</div>
          ))}
          {(plan?.stages || []).map((stage) => {
            const required = paidRequiredFor(plan, stage.key);
            const selected = selectedByStage[stage.key] || 0;
            return (
              <section key={stage.key} className="rounded-3xl border border-border bg-card/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold">{stage.label}</h3>
                      <Badge variant="outline">{stage.stage}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">هدف المرحلة: {stage.goal}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">الفكرة: {stage.idea}</p>
                    {stage.activities && stage.activities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {stage.activities.map((activity) => <Badge key={activity} variant="secondary">{activity}</Badge>)}
                      </div>
                    )}
                  </div>
                  <Badge variant={selected === required ? "default" : "outline"}>{selected}/{required}</Badge>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {paidItemsFor(plan, stage.key).map((idea) => (
                    <PaidIdeaCard
                      key={idea.id}
                      idea={idea}
                      selected={selectedSet.has(idea.id)}
                      disabled={!selectedSet.has(idea.id) && required > 0 && selected >= required}
                      onClick={() => onToggleIdea(idea, stage.key)}
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

function PaidIdeaCard({ idea, selected, disabled, onClick }: { idea: PaidContentIdea; selected: boolean; disabled: boolean; onClick: () => void }) {
  const recommendedFormat = idea.recommended_format || idea.ad_format || "video";
  const description = idea.description || idea.visual_idea || idea.rationale || "";
  const FormatIcon = recommendedFormat === "carousel"
    ? Layers3
    : recommendedFormat === "image_banner"
      ? Image
      : recommendedFormat === "ai_video"
        ? Sparkles
        : PlaySquare;
  return (
    <article
      className={[
        "rounded-2xl border bg-background p-4 text-start transition",
        selected ? "border-[#ff4fa3] shadow-sm ring-2 ring-[#ff4fa3]/20" : "border-border hover:border-[#ff4fa3]/50",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <FormatIcon size={13} />
              {formatLabel(recommendedFormat)}
            </Badge>
            {idea.channel && <Badge variant="outline">{idea.channel}</Badge>}
            {idea.provider && <Badge variant="outline">{idea.provider}</Badge>}
          </div>
          <h4 className="mt-3 text-lg font-semibold leading-7" dir="auto">{idea.title}</h4>
        </div>
      </div>
      {description && <p className="mt-2 text-sm leading-6 text-muted-foreground" dir="auto">{description}</p>}
      <div className="mt-4 border-t border-dashed border-border pt-3">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={[
            "flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition",
            selected
              ? "border-[#ff4fa3] bg-[#ff4fa3] text-white"
              : "border-[#ff4fa3]/40 text-[#d52b82] hover:bg-[#ff4fa3]/10",
            disabled ? "cursor-not-allowed" : "",
          ].join(" ")}
        >
          {selected ? <BadgeCheck size={16} /> : <Sparkles size={16} />}
          {selected ? "مضافة" : "أضف الفكرة"}
        </button>
      </div>
    </article>
  );
}

function formatLabel(format?: string) {
  if (format === "image_banner") return "صورة / بانر";
  if (format === "carousel") return "كاروسيل";
  if (format === "ai_video") return "فيديو AI";
  return "فيديو";
}

function TeachRulesBox({ suiteId }: { suiteId: string }) {
  const [feedback, setFeedback] = useState("");
  const [suggestions, setSuggestions] = useState<ContentRule[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function teach() {
    const text = feedback.trim();
    if (!text) return;
    setBusy("teach");
    setMessage("");
    try {
      const res = await api.suites.teachContentRules(suiteId, { feedback: text });
      setSuggestions(res.suggestions || []);
      if (!res.suggestions?.length) setMessage("ما لقينا قاعدة قابلة للتعميم. جرب صيغة ثانية.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Teach failed");
    } finally {
      setBusy(null);
    }
  }

  async function confirm(rule: ContentRule) {
    setBusy(`confirm-${rule.id}`);
    setMessage("");
    try {
      await api.suites.addContentRules(
        suiteId,
        [{ text: rule.type === "guideline" ? rule.text : "", from: rule.from || "", to: rule.to || "" }],
        "taught"
      );
      setSuggestions((current) => current.filter((item) => item.id !== rule.id));
      setFeedback("");
      setMessage("انحفظت القاعدة — رح تنطبق على كل توليد جاي.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-3">
      <p className="text-xs font-semibold text-muted-foreground">
        علّم النظام — ملاحظة على المحتوى بتتحول لقاعدة دائمة (مثلًا: بدل شيقل اكتب شيكل)
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && teach()}
          placeholder="اكتب ملاحظتك هون..."
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          dir="auto"
        />
        <Button type="button" onClick={teach} disabled={busy === "teach" || !feedback.trim()} variant="outline" className="shrink-0 gap-2">
          {busy === "teach" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          علّم النظام
        </Button>
      </div>
      {message && <p className="mt-2 text-xs text-muted-foreground" dir="auto">{message}</p>}
      {suggestions.length > 0 && (
        <div className="mt-3 space-y-2">
          {suggestions.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant={rule.type === "replace" ? "default" : "secondary"}>
                  {rule.type === "replace" ? "استبدال" : "تعليمة"}
                </Badge>
                <span className="truncate text-sm" dir="auto">
                  {rule.type === "replace" ? `"${rule.from}" ← "${rule.to}"` : rule.text}
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" size="sm" onClick={() => confirm(rule)} disabled={busy === `confirm-${rule.id}`}>
                  {busy === `confirm-${rule.id}` ? <Loader2 size={13} className="animate-spin" /> : "احفظ"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSuggestions((current) => current.filter((item) => item.id !== rule.id))}
                >
                  تجاهل
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
