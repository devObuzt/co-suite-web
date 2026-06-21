
"use client";

import { CalendarDays, CheckCircle2, FileText, Megaphone, Play, Target, TrendingUp } from "lucide-react";
import { GenerateContentRequest, MarketingPlanDeck } from "@/lib/api";
import { Button } from "@/components/ui/button";

const rtlLangs = new Set(["ar", "he", "fa", "ur"]);

const copy = {
  en: {
    insight: "OneShare insight",
    fallbackInsight: "Marketing direction built from the business profile.",
    marketingPlan: "Marketing plan",
    sections: "Sections",
    focus: "Focus",
    generated: "Generated",
    researchBase: "Research base",
    researchDescription: "The plan documents what was used and what still needs validation.",
    monthlyTitle: "Monthly social work plan",
    monthlyDescription: "Organic content plan built around 70% attraction, 20% trust, and 10% sales.",
    questions: "Questions before applying the month",
    calendar: "Calendar and culture checks",
    generate: "Generate",
    needsAsset: "Needs user footage or uploaded asset.",
    funnelTitle: "Paid marketing funnel",
    funnelDescription: "Awareness to ambassador, with creative ideas that can become generated assets or campaign materials.",
  },
  ar: {
    insight: "رؤية من OneShare",
    fallbackInsight: "اتجاه تسويقي مبني على بروفايل المصلحة.",
    marketingPlan: "الخطة التسويقية",
    sections: "الأقسام",
    focus: "التركيز",
    generated: "تم التوليد",
    researchBase: "أساس البحث",
    researchDescription: "الخطة توثق المصادر المستخدمة وما يحتاج تأكيدًا من العميل.",
    monthlyTitle: "خطة العمل الشهرية للسوشيال",
    monthlyDescription: "خطة محتوى عضوية مبنية على 70% جذب، 20% ثقة، و10% مبيعات.",
    questions: "أسئلة قبل تطبيق خطة الشهر",
    calendar: "فحص التقويم والمناسبات الثقافية",
    generate: "ولّد",
    needsAsset: "يحتاج فيديو من العميل أو ملف مرفوع.",
    funnelTitle: "القمع التسويقي المدفوع",
    funnelDescription: "من الوعي حتى السفير، مع أفكار قابلة للتحويل إلى مواد مولدة أو حملات.",
  },
  he: {
    insight: "תובנה של OneShare",
    fallbackInsight: "כיוון שיווקי שנבנה מתוך פרופיל העסק.",
    marketingPlan: "תכנית שיווקית",
    sections: "חלקים",
    focus: "מיקוד",
    generated: "נוצר",
    researchBase: "בסיס המחקר",
    researchDescription: "התכנית מתעדת במה השתמשנו ומה עדיין דורש אימות.",
    monthlyTitle: "תכנית עבודה חודשית לסושיאל",
    monthlyDescription: "תכנית תוכן אורגנית לפי 70% משיכה, 20% אמון ו-10% מכירות.",
    questions: "שאלות לפני יישום החודש",
    calendar: "בדיקת לוח שנה ותרבות",
    generate: "צור",
    needsAsset: "דורש וידאו מהלקוח או קובץ שהועלה.",
    funnelTitle: "משפך שיווק ממומן",
    funnelDescription: "ממודעות ועד שגרירים, עם רעיונות שיכולים להפוך לנכסים או חומרי קמפיין.",
  },
};

function planCopy(language?: string) {
  const lang = (language || "en").split("-")[0] as keyof typeof copy;
  return copy[lang] || copy.en;
}

export function MarketingPlanView({
  deck,
  onGenerateItem,
  showExecutionSections = true,
}: {
  deck: MarketingPlanDeck;
  onGenerateItem?: (request: GenerateContentRequest, title: string) => void;
  showExecutionSections?: boolean;
}) {
  const lang = (deck.language || "").split("-")[0];
  const dir = rtlLangs.has(lang) ? "rtl" : "ltr";
  const t = planCopy(deck.language);
  const sections = deck.sections || [];
  const featured = sections.slice(0, 4);
  const rest = sections.slice(4);

  return (
    <article className="marketing-plan-deck space-y-8" dir={dir}>
      <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm print:border-neutral-200 print:shadow-none">
        <div className="grid min-h-[520px] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[320px] overflow-hidden bg-neutral-950">
            {deck.cover?.image_url ? (
              <img src={deck.cover.image_url} alt="" className="h-full w-full object-cover opacity-90" />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_25%_20%,rgba(47,128,255,.35),transparent_32%),radial-gradient(circle_at_75%_35%,rgba(236,72,153,.25),transparent_30%),linear-gradient(135deg,#050505,#1b1b1f_55%,#090909)]" />
            )}
            <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/10 bg-black/65 p-5 text-white backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-200">{t.insight}</p>
              <p className="mt-2 text-xl font-bold leading-snug" dir="auto">
                {deck.cover?.subtitle || deck.sections?.[0]?.summary || t.fallbackInsight}
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-7 p-7 sm:p-10 lg:p-12">
            <div className="flex flex-wrap gap-2">
              {(deck.cover?.chips || []).slice(0, 6).map((chip) => (
                <span key={chip} className="rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground" dir="auto">
                  {chip}
                </span>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-[color:var(--brand-accent)]">{t.marketingPlan}</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[1.08] tracking-normal text-foreground sm:text-5xl lg:text-6xl" dir="auto">
                {deck.cover?.title || t.marketingPlan}
              </h1>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat icon={<FileText size={18} />} label={t.sections} value={String(sections.length)} />
              <MiniStat icon={<Target size={18} />} label={t.focus} value={deck.research_summary?.confidence || "ready"} />
              <MiniStat icon={<CalendarDays size={18} />} label={t.generated} value={formatDate(deck.generated_at)} />
            </div>
          </div>
        </div>
      </section>

      {deck.research_summary && (
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="text-sm font-semibold text-foreground">{t.researchBase}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.researchDescription}</p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(deck.research_summary.sources_used || []).map((source) => (
                <span key={source} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{source}</span>
              ))}
            </div>
            {(deck.research_summary.limitations || []).length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {(deck.research_summary.limitations || []).slice(0, 4).map((item) => <li key={item} dir="auto">- {item}</li>)}
              </ul>
            )}
          </div>
        </section>
      )}

      {showExecutionSections && deck.monthly_work_plan && (
        <ActionWorkPlan plan={deck.monthly_work_plan} t={t} onGenerateItem={onGenerateItem} />
      )}

      {showExecutionSections && deck.paid_funnel && (
        <PaidFunnel funnel={deck.paid_funnel} t={t} onGenerateItem={onGenerateItem} />
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {featured.map((section, index) => <PlanSection key={section.id || index} section={section} featured />)}
      </section>

      <section className="space-y-4">
        {rest.map((section, index) => <PlanSection key={section.id || index} section={section} />)}
      </section>
    </article>
  );
}

function ActionWorkPlan({
  plan,
  t,
  onGenerateItem,
}: {
  plan: NonNullable<MarketingPlanDeck["monthly_work_plan"]>;
  t: ReturnType<typeof planCopy>;
  onGenerateItem?: (request: GenerateContentRequest, title: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm print:shadow-none">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff4fa3]/10 text-[#ff4fa3]">
          <CalendarDays size={18} />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t.monthlyTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.monthlyDescription}</p>
        </div>
      </div>

      {(plan.content_mix || []).length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(plan.content_mix || []).map((mix) => (
            <div key={mix.type} className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{mix.type}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{mix.percentage}%</p>
            </div>
          ))}
        </div>
      )}

      {(plan.client_focus_questions || []).length > 0 && (
        <div className="mt-5 rounded-xl bg-muted p-4">
          <p className="text-sm font-semibold text-foreground">{t.questions}</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {(plan.client_focus_questions || []).map((question) => <li key={question} dir="auto">- {question}</li>)}
          </ul>
        </div>
      )}

      {(plan.calendar_context?.seasonal_notes || []).length > 0 && (
        <div className="mt-4 rounded-xl border border-[#f8d84a]/30 bg-[#f8d84a]/10 p-4">
          <p className="text-sm font-semibold text-foreground">{t.calendar}</p>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {(plan.calendar_context?.seasonal_notes || []).map((note) => <p key={note} dir="auto">- {note}</p>)}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {(plan.items || []).map((item) => (
          <div key={item.id || item.title} className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground" dir="auto">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                  {[item.objective, item.placement, item.recommended_output?.format, item.recommended_output?.production_mode].filter(Boolean).join(" / ")}
                </p>
              </div>
              {item.generation_request && onGenerateItem && (
                <Button size="sm" variant="outline" onClick={() => onGenerateItem(item.generation_request!, item.title)} className="gap-2">
                  <Play size={14} /> {t.generate}
                </Button>
              )}
            </div>
            {item.prompt && <p className="mt-3 text-sm leading-6 text-muted-foreground" dir="auto">{item.prompt}</p>}
            {item.needs_user_asset && <p className="mt-2 text-xs font-medium text-[#ff4fa3]">{t.needsAsset}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function PaidFunnel({
  funnel,
  t,
  onGenerateItem,
}: {
  funnel: NonNullable<MarketingPlanDeck["paid_funnel"]>;
  t: ReturnType<typeof planCopy>;
  onGenerateItem?: (request: GenerateContentRequest, title: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm print:shadow-none">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2f80ff]/10 text-[#2f80ff]">
          <Megaphone size={18} />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t.funnelTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.funnelDescription}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {(funnel.stages || []).map((stage) => (
          <div key={stage.stage} className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-foreground">{stage.stage}</p>
                {stage.goal && <p className="mt-1 text-sm text-muted-foreground" dir="auto">{stage.goal}</p>}
              </div>
              {stage.budget_direction && <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground" dir="auto">{stage.budget_direction}</span>}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(stage.content_ideas || []).map((idea) => (
                <div key={idea.id || idea.title} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground" dir="auto">{idea.title}</p>
                      {(idea.recommended_outputs || []).length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">{(idea.recommended_outputs || []).join(" + ")}</p>
                      )}
                    </div>
                    {idea.generation_request && onGenerateItem && (
                      <Button size="sm" variant="ghost" onClick={() => onGenerateItem(idea.generation_request!, idea.title)} className="gap-1">
                        <Play size={13} /> {t.generate}
                      </Button>
                    )}
                  </div>
                  {idea.prompt && <p className="mt-2 text-xs leading-5 text-muted-foreground" dir="auto">{idea.prompt}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-[color:var(--brand-accent)]">{icon}</div>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground" dir="auto">{value}</p>
    </div>
  );
}

function PlanSection({ section, featured = false }: { section: MarketingPlanDeck["sections"][number]; featured?: boolean }) {
  return (
    <section className={`break-inside-avoid rounded-2xl border border-border bg-card p-5 shadow-sm print:shadow-none ${featured ? "min-h-[260px]" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]">
          {section.id === "kpis" ? <TrendingUp size={17} /> : <CheckCircle2 size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-foreground" dir="auto">{section.title}</h2>
          {section.summary && <p className="mt-2 text-sm leading-6 text-muted-foreground" dir="auto">{section.summary}</p>}
        </div>
      </div>

      {section.metrics && section.metrics.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {section.metrics.slice(0, 3).map((metric) => (
            <div key={`${metric.label}-${metric.value}`} className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground" dir="auto">{metric.label}</p>
              <p className="mt-1 text-lg font-bold text-foreground" dir="auto">{metric.value}</p>
            </div>
          ))}
        </div>
      )}

      {section.bullets && section.bullets.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-foreground">
          {section.bullets.slice(0, featured ? 5 : 8).map((bullet) => <li key={bullet} dir="auto">{bullet}</li>)}
        </ul>
      )}

      {section.cards && section.cards.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {section.cards.slice(0, featured ? 2 : 4).map((card) => (
            <div key={`${card.title}-${card.body}`} className="rounded-xl border border-border bg-background p-3">
              <p className="text-sm font-semibold text-foreground" dir="auto">{card.title}</p>
              {card.body && <p className="mt-1 text-xs leading-5 text-muted-foreground" dir="auto">{card.body}</p>}
              {(card.points || []).length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {(card.points || []).slice(0, 3).map((point) => <p key={point} dir="auto">- {point}</p>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) return "now";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
  } catch {
    return "now";
  }
}
