
"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  Eye,
  FileDown,
  Loader2,
  Megaphone,
  Play,
  RefreshCw,
  Search,
  Share2,
  Target,
} from "lucide-react";
import {
  api,
  GenerateContentRequest,
  GenerationStatus,
  MarketingActionItem,
  MarketingActionPlan,
  MarketingIntelligence,
  MarketingPlanDeck,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketingPlanView } from "@/components/marketing-plan/MarketingPlanView";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function isPlanGenerationActive(status?: GenerationStatus | null) {
  if (!status) return false;
  return Boolean(status.is_active || ["queued", "waiting_capacity", "waiting_provider_limit", "running", "retrying"].includes(status.status));
}

function planStageLabel(status: string | undefined, lang: string) {
  if (status === "completed") return lang === "ar" ? "جاهز" : lang === "he" ? "מוכן" : "Ready";
  if (status === "running") return lang === "ar" ? "قيد العمل" : lang === "he" ? "בעבודה" : "Running";
  if (status === "failed") return lang === "ar" ? "فشل" : lang === "he" ? "נכשל" : "Failed";
  return lang === "ar" ? "بانتظار" : lang === "he" ? "ממתין" : "Pending";
}

function PlanGenerationStages({ status, lang }: { status?: GenerationStatus | null; lang: string }) {
  const stages = status?.stages || status?.result?.stages || [];
  if (!stages.length) return null;
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {stages.map((stage) => {
        const state = stage.status || "pending";
        const active = state === "running";
        const done = state === "completed";
        return (
          <div
            key={stage.id}
            className={`rounded-lg border px-3 py-2 ${
              done
                ? "border-emerald-500/30 bg-emerald-500/10"
                : active
                  ? "border-blue-500/30 bg-blue-500/10"
                  : "border-border bg-background/70"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium">{stage.label || stage.id}</span>
              <span className="shrink-0 text-[11px] opacity-75">{planStageLabel(state, lang)}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/10">
              <div
                className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : active ? "bg-blue-500" : "bg-muted-foreground/30"}`}
                style={{ width: `${done ? 100 : active ? Math.max(12, Math.min(100, stage.progress || status?.progress || 10)) : 0}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const copy = {
  ar: {
    title: "عرض الخطة التسويقية",
    desc: "خطة تفاعلية تشبه عرضاً للعميل، قابلة للمشاركة والتحميل كـ PDF.",
    generate: "توليد الخطة",
    regenerate: "توليد من جديد",
    generating: "جاري بناء الخطة...",
    missingTitle: "لا توجد خطة تسويقية بعد",
    missingDesc: "سنستخدم بيانات السوت، العلامة التجارية، الروابط، المنافسين والمعطيات المتاحة لبناء عرض واضح للعميل.",
    share: "تفعيل رابط المشاركة",
    password: "كلمة سر اختيارية",
    focus: "شو بدك تركز عليه بالشهر القريب؟",
    focusPlaceholder: "مثال: منتج جديد، عرض، حملة رمضان/عيد، خدمة بدنا ندفعها...",
    campaigns: "حملات أو منتجات قريبة",
    campaignsPlaceholder: "افصل بين العناصر بسطر جديد",
    notes: "ملاحظات تخطيط إضافية",
    print: "تحميل PDF",
    copyLink: "نسخ الرابط",
    copied: "تم النسخ",
    open: "فتح الرابط",
    generationQueued: "تم إرسال المحتوى للتوليد",
    planQueued: "تم إرسال الخطة للتوليد. يمكنك مغادرة الصفحة والرجوع لاحقاً.",
    planStatus: "حالة توليد الخطة",
    tabMarket: "السوق",
    tabStrategy: "الخطة",
    tabSocial: "السوشيال",
    tabAds: "الإعلانات",
    tabApply: "التطبيق",
    marketTitle: "قراءة السوق والمنافسين",
    marketDesc: "قبل ما نطبّق الخطة، نعرض المصادر، المنافسين، الطلب، العرض، والفرص.",
    competitors: "المنافسون",
    demand: "الطلب",
    supply: "العرض",
    opportunities: "الفرص",
    sources: "المصادر",
    warnings: "ملاحظات",
    noCompetitors: "لم يتم توليد بحث منافسين خارجي بعد. هذه المنطقة جاهزة للـ Slice القادمة.",
    socialTitle: "خطة السوشيال القابلة للتطبيق",
    socialDesc: "كل عنصر يمكن تعديله، توليده، أو طلب ملف من العميل حسب الحاجة.",
    adsTitle: "قمع الإعلانات القابل للتطبيق",
    adsDesc: "أفكار الحملات موزعة حسب القمع التسويقي من الوعي حتى السفير.",
    applyTitle: "تطبيق الخطة",
    applyDesc: "اختر نطاق التطبيق. واجهة التنفيذ الكاملة ستفتح كمساحة عمل مستقلة في المرحلة التالية.",
    applyFull: "تطبيق كامل الخطة",
    applySocial: "تطبيق خطة السوشيال فقط",
    applyAds: "تطبيق خطة الإعلانات فقط",
    needsAssets: "يحتاج ملفات من العميل",
    readyToGenerate: "جاهز للتوليد",
    generateSocialPlan: "توليد خطة السوشيال",
    generateAdsFunnel: "توليد قمع الإعلانات",
    sectionQueued: "تم إرسال هذا القسم للتوليد",
    socialMissingDesc: "الخطة الأساسية جاهزة. ولّد خطة السوشيال عندما تريد تفاصيل التنفيذ الشهرية.",
    adsMissingDesc: "الخطة الأساسية جاهزة. ولّد قمع الإعلانات عندما تريد أفكار الحملات المدفوعة.",
  },
  he: {
    title: "מצגת התכנית השיווקית",
    desc: "תכנית אינטראקטיבית ללקוח, לשיתוף ולהורדה כ-PDF.",
    generate: "צור תכנית",
    regenerate: "צור מחדש",
    generating: "בונה את התכנית...",
    missingTitle: "עדיין אין תכנית שיווקית",
    missingDesc: "נשתמש בנתוני הסוויט, המותג, הקישורים, המתחרים והנתונים הזמינים כדי לבנות מצגת ברורה ללקוח.",
    share: "הפעל קישור שיתוף",
    password: "סיסמה אופציונלית",
    focus: "במה תרצה להתמקד בחודש הקרוב?",
    focusPlaceholder: "לדוגמה: מוצר חדש, מבצע, חג, שירות שצריך לדחוף...",
    campaigns: "קמפיינים או מוצרים קרובים",
    campaignsPlaceholder: "הפרד כל פריט בשורה חדשה",
    notes: "הערות תכנון נוספות",
    print: "הורד PDF",
    copyLink: "העתק קישור",
    copied: "הועתק",
    open: "פתח קישור",
    generationQueued: "התוכן נשלח ליצירה",
    planQueued: "התכנית נשלחה ליצירה. אפשר לצאת מהעמוד ולחזור מאוחר יותר.",
    planStatus: "סטטוס יצירת התכנית",
    tabMarket: "שוק",
    tabStrategy: "תכנית",
    tabSocial: "סושיאל",
    tabAds: "מודעות",
    tabApply: "יישום",
    marketTitle: "מחקר שוק ומתחרים",
    marketDesc: "לפני יישום התכנית מציגים מקורות, מתחרים, ביקוש, היצע והזדמנויות.",
    competitors: "מתחרים",
    demand: "ביקוש",
    supply: "היצע",
    opportunities: "הזדמנויות",
    sources: "מקורות",
    warnings: "הערות",
    noCompetitors: "עדיין לא נוצר מחקר מתחרים חיצוני. האזור מוכן לסלייס הבא.",
    socialTitle: "תכנית סושיאל לביצוע",
    socialDesc: "כל פריט ניתן לעריכה, יצירה, או בקשת קובץ מהלקוח.",
    adsTitle: "משפך מודעות לביצוע",
    adsDesc: "רעיונות קמפיינים מסודרים לפי המשפך השיווקי.",
    applyTitle: "יישום התכנית",
    applyDesc: "בחר היקף יישום. סביבת הביצוע המלאה תיפתח בשלב הבא.",
    applyFull: "יישום כל התכנית",
    applySocial: "יישום סושיאל בלבד",
    applyAds: "יישום מודעות בלבד",
    needsAssets: "דורש קבצים מהלקוח",
    readyToGenerate: "מוכן ליצירה",
    generateSocialPlan: "צור תכנית סושיאל",
    generateAdsFunnel: "צור משפך מודעות",
    sectionQueued: "החלק נשלח ליצירה",
    socialMissingDesc: "התכנית הבסיסית מוכנה. צור את תכנית הסושיאל כשתרצה פירוט ביצוע חודשי.",
    adsMissingDesc: "התכנית הבסיסית מוכנה. צור את משפך המודעות כשתרצה רעיונות לקמפיינים ממומנים.",
  },
  en: {
    title: "Marketing Plan Deck",
    desc: "An interactive client-ready plan that can be shared and printed as PDF.",
    generate: "Generate plan",
    regenerate: "Regenerate",
    generating: "Building the plan...",
    missingTitle: "No marketing plan yet",
    missingDesc: "OneShare will use suite data, brand profile, links, competitors, and available metrics to create a clear client deck.",
    share: "Enable share link",
    password: "Optional password",
    focus: "What should we focus on soon?",
    focusPlaceholder: "Example: new product, offer, holiday campaign, service to push...",
    campaigns: "Upcoming products or campaigns",
    campaignsPlaceholder: "Put each item on a new line",
    notes: "Extra planning notes",
    print: "Download PDF",
    copyLink: "Copy link",
    copied: "Copied",
    open: "Open link",
    generationQueued: "Content sent to generation",
    planQueued: "The plan was queued. You can leave this page and come back later.",
    planStatus: "Plan generation status",
    tabMarket: "Market",
    tabStrategy: "Strategy",
    tabSocial: "Social",
    tabAds: "Ads",
    tabApply: "Apply",
    marketTitle: "Market and competitor intelligence",
    marketDesc: "Before applying the plan, show sources, competitors, demand, supply, and opportunities.",
    competitors: "Competitors",
    demand: "Demand",
    supply: "Supply",
    opportunities: "Opportunities",
    sources: "Sources",
    warnings: "Notes",
    noCompetitors: "External competitor research has not been generated yet. This area is ready for the next slice.",
    socialTitle: "Executable social plan",
    socialDesc: "Each item can be edited, generated, or blocked until the client uploads the needed asset.",
    adsTitle: "Executable ads funnel",
    adsDesc: "Campaign ideas arranged by funnel stage from awareness to ambassador.",
    applyTitle: "Apply plan",
    applyDesc: "Choose the application scope. The full execution workspace will open in the next implementation slice.",
    applyFull: "Apply full plan",
    applySocial: "Apply social only",
    applyAds: "Apply ads only",
    needsAssets: "Needs client assets",
    readyToGenerate: "Ready to generate",
    generateSocialPlan: "Generate social plan",
    generateAdsFunnel: "Generate ads funnel",
    sectionQueued: "Section sent to generation",
    socialMissingDesc: "The core plan is ready. Generate the social plan when you need monthly execution detail.",
    adsMissingDesc: "The core plan is ready. Generate the ads funnel when you need paid campaign ideas.",
  },
};

type PlanTab = "market" | "strategy" | "social" | "ads" | "apply";

export default function MarketingPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, dir } = useLanguage();
  const text = copy[lang as keyof typeof copy] || copy.en;
  const [deck, setDeck] = useState<MarketingPlanDeck | null>(null);
  const [intelligence, setIntelligence] = useState<MarketingIntelligence | null>(null);
  const [actionPlan, setActionPlan] = useState<MarketingActionPlan | null>(null);
  const [activeTab, setActiveTab] = useState<PlanTab>("market");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [password, setPassword] = useState("");
  const [nearTermFocus, setNearTermFocus] = useState("");
  const [upcomingCampaigns, setUpcomingCampaigns] = useState("");
  const [planningNotes, setPlanningNotes] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [generationMessage, setGenerationMessage] = useState("");

  const load = useCallback(async (options?: { quiet?: boolean }) => {
    if (!options?.quiet) setLoading(true);
    setError("");
    try {
      const res = await api.marketingPlans.get(id);
      setDeck(res.deck);
      setIntelligence(res.intelligence || null);
      setActionPlan(res.action_plan || null);
      setGenerationStatus(res.generation_status || null);
      if (res.deck?.share?.token && typeof window !== "undefined") {
        setShareUrl(`${window.location.origin}/marketing-plans/share/${res.deck.share.token}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      if (!options?.quiet) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isPlanGenerationActive(generationStatus)) return;
    const timer = window.setInterval(async () => {
      try {
        const status = await api.marketingPlans.status(id);
        setGenerationStatus(status);
        if (status.status === "completed") {
          await load({ quiet: true });
        }
        if (status.status === "failed" || status.status === "timeout") {
          setError(status.safe_error || status.error || "Request failed");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [generationStatus, id, load]);

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await api.marketingPlans.generate(id, {
        language: lang,
        near_term_focus: nearTermFocus.trim() || undefined,
        upcoming_campaigns: upcomingCampaigns.split("\n").map((item) => item.trim()).filter(Boolean),
        planning_notes: planningNotes.trim() || undefined,
      });
      setDeck(res.deck);
      setIntelligence(res.intelligence || null);
      setActionPlan(res.action_plan || null);
      setGenerationStatus(res.generation_status || null);
      if (res.deck?.share?.token && typeof window !== "undefined") {
        setShareUrl(`${window.location.origin}/marketing-plans/share/${res.deck.share.token}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setGenerating(false);
    }
  }

  function planningPayload() {
    return {
      language: lang,
      near_term_focus: nearTermFocus.trim() || undefined,
      upcoming_campaigns: upcomingCampaigns.split("\n").map((item) => item.trim()).filter(Boolean),
      planning_notes: planningNotes.trim() || undefined,
    };
  }

  async function generateExecutionSection(section: "social" | "ads") {
    setGenerating(true);
    setError("");
    setGenerationMessage("");
    try {
      const res = section === "social"
        ? await api.marketingPlans.generateSocialPlan(id, planningPayload())
        : await api.marketingPlans.generatePaidFunnel(id, planningPayload());
      setDeck(res.deck);
      setIntelligence(res.intelligence || null);
      setActionPlan(res.action_plan || null);
      setGenerationStatus(res.generation_status || null);
      setGenerationMessage(`${text.sectionQueued}: ${section === "social" ? text.tabSocial : text.tabAds}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setGenerating(false);
    }
  }

  async function enableShare() {
    setSharing(true);
    setError("");
    try {
      const res = await api.marketingPlans.share(id, { enabled: true, password: password || undefined });
      if (res.share.token && typeof window !== "undefined") {
        const url = `${window.location.origin}/marketing-plans/share/${res.share.token}`;
        setShareUrl(url);
        setDeck((current) => current ? { ...current, share: res.share } : current);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSharing(false);
    }
  }

  async function copyShare() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function generatePlanItem(request: GenerateContentRequest, title: string) {
    setError("");
    setGenerationMessage("");
    try {
      const next = await api.content.generate(id, {
        ...request,
        prompt: request.prompt || title,
        use_brand: request.use_brand ?? true,
        language: lang,
      });
      setGenerationStatus(next);
      setGenerationMessage(`${text.generationQueued}: ${title}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }

  const planGenerationActive = isPlanGenerationActive(generationStatus);
  const planProgress = Math.max(0, Math.min(100, Number(generationStatus?.progress || 0)));
  const planStatusText = generationStatus?.message || (planGenerationActive ? text.planQueued : "");
  const planStatusVisible = generationStatus && generationStatus.status !== "idle" && (
    planGenerationActive ||
    generating ||
    (!deck && ["failed", "timeout", "cancelled"].includes(generationStatus.status))
  );

  return (
    <SuitePageShell title={text.title} description={text.desc}>
      <div className="marketing-plan-controls space-y-4" dir={dir}>
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-3 md:grid-cols-[1.1fr_.9fr]">
          <label className="block text-sm font-medium text-foreground">
            {text.focus}
            <textarea
              value={nearTermFocus}
              onChange={(e) => setNearTermFocus(e.target.value)}
              placeholder={text.focusPlaceholder}
              className="mt-2 min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--brand-accent)]"
              dir="auto"
            />
          </label>
          <div className="grid gap-3">
            <label className="block text-sm font-medium text-foreground">
              {text.campaigns}
              <textarea
                value={upcomingCampaigns}
                onChange={(e) => setUpcomingCampaigns(e.target.value)}
                placeholder={text.campaignsPlaceholder}
                className="mt-2 min-h-16 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--brand-accent)]"
                dir="auto"
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {text.notes}
              <Input value={planningNotes} onChange={(e) => setPlanningNotes(e.target.value)} dir="auto" />
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <Button onClick={generate} disabled={generating || planGenerationActive} className="gap-2">
            {generating || planGenerationActive ? <Loader2 size={16} className="animate-spin" /> : deck ? <RefreshCw size={16} /> : <FileDown size={16} />}
            {generating || planGenerationActive ? text.generating : deck ? text.regenerate : text.generate}
          </Button>
          {deck && (
            <>
              <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <FileDown size={16} /> {text.print}
              </Button>
              <div className="flex min-w-[280px] flex-1 items-center gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={text.password} type="password" />
                <Button variant="outline" onClick={enableShare} disabled={sharing} className="gap-2">
                  {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />} {text.share}
                </Button>
              </div>
              {shareUrl && (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Input value={shareUrl} readOnly dir="ltr" className="min-w-0" />
                  <Button variant="outline" onClick={copyShare} className="gap-2">
                    <Copy size={16} /> {copied ? text.copied : text.copyLink}
                  </Button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted hover:text-foreground"
                  >
                    <Eye size={16} /> {text.open}
                  </a>
                </div>
              )}
            </>
          )}
        </div>
        {planStatusVisible && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-800 dark:text-blue-100" dir="auto">
            <div className="flex items-center justify-between gap-3">
              <span>
                <strong>{text.planStatus}:</strong> {generationStatus.status}
                {planStatusText ? ` · ${planStatusText}` : ""}
              </span>
              <span>{planProgress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-500/15">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${planProgress}%` }} />
            </div>
            <PlanGenerationStages status={generationStatus} lang={lang} />
          </div>
        )}
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200" dir="auto">{error}</div>}
        {generationMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-200" dir="auto">
            {generationMessage}
            {generationStatus?.status ? ` · ${generationStatus.status}` : ""}
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          <Loader2 className="mx-auto animate-spin" />
        </div>
      ) : deck ? (
        <div className="space-y-5">
          <PlanTabs active={activeTab} setActive={setActiveTab} text={text} />
          {activeTab === "market" && <MarketIntelligencePanel intelligence={intelligence} text={text} />}
          {activeTab === "strategy" && <MarketingPlanView deck={deck} onGenerateItem={generatePlanItem} showExecutionSections={false} />}
          {activeTab === "social" && (actionPlan?.social_items?.length ? (
            <ActionItemsPanel title={text.socialTitle} description={text.socialDesc} items={actionPlan.social_items} text={text} onGenerateItem={generatePlanItem} />
          ) : (
            <GenerateSectionPanel
              icon={<CalendarDays size={28} />}
              title={text.socialTitle}
              description={text.socialMissingDesc}
              buttonLabel={text.generateSocialPlan}
              disabled={generating || planGenerationActive}
              loading={generating || planGenerationActive}
              onGenerate={() => generateExecutionSection("social")}
            />
          ))}
          {activeTab === "ads" && (actionPlan?.ad_funnel_items?.length ? (
            <ActionItemsPanel title={text.adsTitle} description={text.adsDesc} items={actionPlan.ad_funnel_items} text={text} onGenerateItem={generatePlanItem} groupedByFunnel />
          ) : (
            <GenerateSectionPanel
              icon={<Megaphone size={28} />}
              title={text.adsTitle}
              description={text.adsMissingDesc}
              buttonLabel={text.generateAdsFunnel}
              disabled={generating || planGenerationActive}
              loading={generating || planGenerationActive}
              onGenerate={() => generateExecutionSection("ads")}
            />
          ))}
          {activeTab === "apply" && <ApplyPlanPanel actionPlan={actionPlan} text={text} />}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <FileDown size={34} className="mx-auto text-muted-foreground" />
          <h2 className="mt-3 text-xl font-bold text-foreground">{text.missingTitle}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">{text.missingDesc}</p>
          <Button onClick={generate} disabled={generating || planGenerationActive} className="mt-5 gap-2">
            {generating || planGenerationActive ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {generating || planGenerationActive ? text.generating : text.generate}
          </Button>
        </div>
      )}
    </SuitePageShell>
  );
}

function PlanTabs({
  active,
  setActive,
  text,
}: {
  active: PlanTab;
  setActive: (tab: PlanTab) => void;
  text: (typeof copy)["en"];
}) {
  const tabs: Array<{ id: PlanTab; label: string; icon: React.ReactNode }> = [
    { id: "market", label: text.tabMarket, icon: <Search size={15} /> },
    { id: "strategy", label: text.tabStrategy, icon: <FileDown size={15} /> },
    { id: "social", label: text.tabSocial, icon: <CalendarDays size={15} /> },
    { id: "ads", label: text.tabAds, icon: <Megaphone size={15} /> },
    { id: "apply", label: text.tabApply, icon: <Play size={15} /> },
  ];
  return (
    <div className="sticky top-0 z-10 -mx-1 overflow-x-auto bg-background/85 px-1 py-2 backdrop-blur print:hidden">
      <div className="inline-flex min-w-full gap-2 rounded-2xl border border-border bg-card p-1 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              active === tab.id
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GenerateSectionPanel({
  icon,
  title,
  description,
  buttonLabel,
  disabled,
  loading,
  onGenerate,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  disabled?: boolean;
  loading?: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <h2 className="mt-4 text-xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground" dir="auto">{description}</p>
      <Button onClick={onGenerate} disabled={disabled} className="mt-5 gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
        {buttonLabel}
      </Button>
    </div>
  );
}

function MarketIntelligencePanel({
  intelligence,
  text,
}: {
  intelligence: MarketingIntelligence | null;
  text: (typeof copy)["en"];
}) {
  const competitors = intelligence?.competitors || [];
  const demand = intelligence?.demand_signals || [];
  const supply = intelligence?.supply_signals || [];
  const opportunities = intelligence?.opportunities || [];
  const sources = intelligence?.source_links || [];
  const warnings = intelligence?.warnings || [];

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2f80ff]/10 text-[#2f80ff]">
            <Search size={19} />
          </span>
          <div>
            <h2 className="text-2xl font-black text-foreground">{text.marketTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text.marketDesc}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-bold text-foreground">{text.competitors}</h3>
          {competitors.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">{text.noCompetitors}</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {competitors.map((competitor) => (
                <div key={competitor.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-foreground" dir="auto">{competitor.name}</p>
                      <p className="mt-1 text-xs uppercase text-muted-foreground">{competitor.platform}</p>
                    </div>
                    {competitor.url && (
                      <a href={competitor.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                  {[competitor.reason, competitor.offer, competitor.evidence, competitor.opportunity].filter(Boolean).slice(0, 3).map((line) => (
                    <p key={line} className="mt-2 text-sm leading-6 text-muted-foreground" dir="auto">{line}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <SignalCard title={text.demand} items={demand} accent="blue" />
          <SignalCard title={text.supply} items={supply} accent="pink" />
          <SignalCard title={text.opportunities} items={opportunities} accent="yellow" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5">
          <h3 className="text-lg font-bold text-foreground">{text.sources}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {sources.length === 0 ? (
              <span className="text-sm text-muted-foreground">-</span>
            ) : sources.map((source) => (
              <a key={`${source.source}-${source.url}-${source.label}`} href={source.url || "#"} target="_blank" rel="noreferrer" className="rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground hover:text-foreground" dir="auto">
                {source.source ? `${source.source}: ` : ""}{source.label}
              </a>
            ))}
          </div>
        </div>
        {warnings.length > 0 && (
          <div className="rounded-3xl border border-[#f8d84a]/40 bg-[#f8d84a]/10 p-5">
            <h3 className="text-lg font-bold text-foreground">{text.warnings}</h3>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {warnings.map((warning) => <p key={warning} dir="auto">- {warning}</p>)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SignalCard({ title, items, accent }: { title: string; items: Array<{ id: string; title: string; source?: string }>; accent: "blue" | "pink" | "yellow" }) {
  const color = accent === "blue" ? "bg-[#2f80ff]/10 text-[#2f80ff]" : accent === "pink" ? "bg-[#ff4fa3]/10 text-[#ff4fa3]" : "bg-[#f8d84a]/20 text-[#9a6b00]";
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>
          <Target size={16} />
        </span>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">-</p>
        ) : items.slice(0, 6).map((item) => (
          <p key={item.id} className="rounded-2xl border border-border bg-background p-3 text-sm text-muted-foreground" dir="auto">
            {item.title}
          </p>
        ))}
      </div>
    </div>
  );
}

function ActionItemsPanel({
  title,
  description,
  items,
  text,
  onGenerateItem,
  groupedByFunnel = false,
}: {
  title: string;
  description: string;
  items: MarketingActionItem[];
  text: (typeof copy)["en"];
  onGenerateItem: (request: GenerateContentRequest, title: string) => void;
  groupedByFunnel?: boolean;
}) {
  const grouped = groupedByFunnel
    ? items.reduce<Record<string, MarketingActionItem[]>>((acc, item) => {
        const key = item.funnel_stage || "Other";
        acc[key] = acc[key] || [];
        acc[key].push(item);
        return acc;
      }, {})
    : { all: items };

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-2xl font-black text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {Object.entries(grouped).map(([group, groupItems]) => (
        <div key={group} className="space-y-3">
          {groupedByFunnel && <h3 className="text-lg font-bold text-foreground">{group}</h3>}
          <div className="grid gap-3 lg:grid-cols-2">
            {groupItems.map((item) => (
              <div key={item.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-foreground" dir="auto">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                      {[item.objective, item.channel, item.placement, item.production_mode, ...(item.output_types || [])].filter(Boolean).join(" / ")}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.required_assets?.length ? "bg-[#f8d84a]/20 text-[#9a6b00]" : "bg-emerald-500/10 text-emerald-600"}`}>
                    {item.required_assets?.length ? text.needsAssets : text.readyToGenerate}
                  </span>
                </div>
                {item.generation_prompt && <p className="mt-3 text-sm leading-6 text-muted-foreground" dir="auto">{item.generation_prompt}</p>}
                {item.required_assets && item.required_assets.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.required_assets.map((asset) => (
                      <span key={asset} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">{asset}</span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!item.generation_request || Boolean(item.required_assets?.length)}
                    onClick={() => item.generation_request && onGenerateItem(item.generation_request, item.title)}
                    className="gap-2"
                  >
                    <Play size={14} /> {text.generate}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ApplyPlanPanel({
  actionPlan,
  text,
}: {
  actionPlan: MarketingActionPlan | null;
  text: (typeof copy)["en"];
}) {
  const socialCount = actionPlan?.social_items?.length || 0;
  const adsCount = actionPlan?.ad_funnel_items?.length || 0;
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
          <Play size={19} />
        </span>
        <div>
          <h2 className="text-2xl font-black text-foreground">{text.applyTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{text.applyDesc}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <ApplyScopeButton title={text.applyFull} count={socialCount + adsCount} />
        <ApplyScopeButton title={text.applySocial} count={socialCount} />
        <ApplyScopeButton title={text.applyAds} count={adsCount} />
      </div>
    </section>
  );
}

function ApplyScopeButton({ title, count }: { title: string; count: number }) {
  return (
    <button
      type="button"
      disabled
      className="rounded-2xl border border-dashed border-border bg-background p-4 text-start opacity-80"
    >
      <p className="font-bold text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{count} items</p>
      <p className="mt-4 text-xs text-muted-foreground">Execution workspace: next slice</p>
    </button>
  );
}
