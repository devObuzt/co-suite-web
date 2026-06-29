"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  Camera,
  Download,
  Eye,
  FileSearch,
  Globe2,
  Info,
  Loader2,
  MapPinned,
  Package,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { api, Brand, MarketingCompetitor, MarketingIntelligence, MarketingKeyword, MarketingPersona, MarketingPlanResponse, Suite } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type StageSlug = "services" | "keywords" | "competitors" | "demand-supply" | "personas" | "pdf";
type BusyAction = StageSlug | "keywords-more" | "competitors-more" | "personas-more" | "save-services" | "save-keywords" | "save-competitors" | null;

const labels = {
  ar: {
    title: "الخطة التسويقية",
    desc: "مقسمة لمراحل عملية. كل مرحلة تولد أو تحفظ بياناتها بشكل مستقل.",
    servicesTitle: "الخدمات / المنتجات",
    servicesDesc: "هذه المرحلة تلقائية وتعتمد على بيانات السوت. أي تعديل هنا يحدّث السوت نفسه.",
    addService: "إضافة",
    newService: "خدمة أو منتج جديد",
    newKeyword: "كلمة مفتاحية جديدة",
    addKeyword: "إضافة كلمة",
    moveKeywordUp: "رفع الكلمة",
    moveKeywordDown: "تنزيل الكلمة",
    removeKeyword: "حذف الكلمة",
    emptyServices: "لا توجد خدمات بعد. أضف أول خدمة حتى تعتمد عليها باقي المراحل.",
    keywordsTitle: "الكلمات المفتاحية",
    keywordsDesc: "نولّد كلمات ملائمة بناءً على فئة البزنس والخدمات واللغة.",
    competitorsTitle: "المنافسون",
    competitorsDesc: "نبحث حسب المصدر ونفصل النتائج بين Google Organic وMaps والمنصات الاجتماعية.",
    demandTitle: "العرض والطلب",
    demandDesc: "نقرأ الطلب والمنافسة من Google Ads Keyword Planner حسب البلد واللغة والكلمات.",
    personasTitle: "شخصيات العملاء",
    personasDesc: "نبني بروفايلات عملاء محتملين ونربط الحاجة بالعرض التسويقي.",
    pdfTitle: "ملف الخطة التسويقية",
    pdfDesc: "نجهّز ملف PDF قابل للتحميل من كل الأقسام التي تم توليدها.",
    showIntro: "عرض شرح الخطة",
    hideIntro: "إخفاء شرح الخطة",
    downloadPdf: "تحميل PDF",
    generate: "Generate",
    generateMore: "Generate More",
    openStage: "فتح الصفحة",
    copy: "نسخ",
    copied: "تم النسخ",
    preview: "مشاهدة",
    close: "إغلاق",
    open: "فتح",
    locked: "غير متاح حتى يتم التوليد",
    noKeywords: "لم يتم توليد كلمات بعد.",
    noCompetitors: "لم يتم توليد منافسين بعد.",
    noSourceCompetitors: "لا توجد نتائج من هذا المصدر.",
    newCompetitorName: "اسم المنافس",
    newCompetitorUrl: "رابط المنافس",
    newCompetitorDescription: "وصف مختصر أو ملاحظة",
    addCompetitor: "إضافة منافس",
    cancel: "إلغاء",
    moveCompetitorUp: "رفع المنافس",
    moveCompetitorDown: "تنزيل المنافس",
    sourceOverview: "عرض كل المصادر",
    noDemand: "لم يتم توليد العرض والطلب بعد.",
    noPersonas: "لم يتم توليد شخصيات العملاء بعد.",
    loadingMorePersonas: "جاري جلب شخصيات إضافية...",
    demandAvg: "متوسط الطلب",
    demandCompetition: "المنافسة",
    marketPressure: "ضغط السوق",
    suggestedKeywords: "اقتراحات Google",
    keyword: "الكلمة",
    source: "المصدر",
    searches: "البحث الشهري",
    competition: "المنافسة",
    bidRange: "نطاق النقرة",
    demandSignals: "الطلب",
    supplySignals: "العرض",
    opportunitySignals: "الفرص",
    showAll: "عرض الكل",
    collapse: "إخفاء",
    notCompetitor: "غير منافس",
    goodCompetitor: "منافس جيد",
    localCompetitor: "منافس محلي",
    globalCompetitor: "منافس عالمي",
    age: "العمر",
    gender: "الجندر",
    profession: "المهنة",
    economicStatus: "الوضع الاقتصادي",
    challenge: "التحدي",
    need: "الحاجة",
    motivation: "الدافع",
    solution: "الحل من العرض",
    pdfNeedsPersonas: "ولّد شخصيات العملاء أولاً حتى يصبح ملف الخطة جاهزاً للتحميل.",
  },
  en: {
    title: "Marketing Plan",
    desc: "Split into practical stages. Each stage saves or generates independently.",
    servicesTitle: "Services / Products",
    servicesDesc: "This stage is automatic and updates the Suite profile directly.",
    addService: "Add",
    newService: "New service or product",
    newKeyword: "New keyword",
    addKeyword: "Add keyword",
    moveKeywordUp: "Move keyword up",
    moveKeywordDown: "Move keyword down",
    removeKeyword: "Remove keyword",
    emptyServices: "No services yet. Add the first service so the next stages have context.",
    keywordsTitle: "Keywords",
    keywordsDesc: "Generate suitable keywords from the business category, services, and language.",
    competitorsTitle: "Competitors",
    competitorsDesc: "Search by source and split results across Google Organic, Maps, and social platforms.",
    demandTitle: "Demand and Supply",
    demandDesc: "Read demand and competition from Google Ads Keyword Planner by country, language, and keywords.",
    personasTitle: "Customer Personas",
    personasDesc: "Build potential customer profiles and connect their needs to the marketing offer.",
    pdfTitle: "Marketing Plan PDF",
    pdfDesc: "Prepare a downloadable PDF from every generated section.",
    showIntro: "Show plan explanation",
    hideIntro: "Hide plan explanation",
    downloadPdf: "Download PDF",
    generate: "Generate",
    generateMore: "Generate More",
    openStage: "Open page",
    copy: "Copy",
    copied: "Copied",
    preview: "Preview",
    close: "Close",
    open: "Open",
    locked: "Locked until generated",
    noKeywords: "No keywords generated yet.",
    noCompetitors: "No competitors generated yet.",
    noSourceCompetitors: "No results from this source.",
    newCompetitorName: "Competitor name",
    newCompetitorUrl: "Competitor link",
    newCompetitorDescription: "Short description or note",
    addCompetitor: "Add competitor",
    cancel: "Cancel",
    moveCompetitorUp: "Move competitor up",
    moveCompetitorDown: "Move competitor down",
    sourceOverview: "View all sources",
    noDemand: "Demand and supply have not been generated yet.",
    noPersonas: "No customer personas generated yet.",
    loadingMorePersonas: "Loading more customer personas...",
    demandAvg: "Average demand",
    demandCompetition: "Competition",
    marketPressure: "Market pressure",
    suggestedKeywords: "Google suggestions",
    keyword: "Keyword",
    source: "Source",
    searches: "Monthly searches",
    competition: "Competition",
    bidRange: "Bid range",
    demandSignals: "Demand",
    supplySignals: "Supply",
    opportunitySignals: "Opportunities",
    showAll: "Show all",
    collapse: "Collapse",
    notCompetitor: "Not a competitor",
    goodCompetitor: "Good competitor",
    localCompetitor: "Local competitor",
    globalCompetitor: "Global competitor",
    age: "Age",
    gender: "Gender",
    profession: "Profession",
    economicStatus: "Economic status",
    challenge: "Challenge",
    need: "Need",
    motivation: "Motivation",
    solution: "Offer solution",
    pdfNeedsPersonas: "Generate customer personas first so the plan file is ready to download.",
  },
  he: {
    title: "התכנית השיווקית",
    desc: "מחולקת לשלבים מעשיים. כל שלב נשמר או נוצר באופן עצמאי.",
    servicesTitle: "שירותים / מוצרים",
    servicesDesc: "שלב אוטומטי שמעדכן ישירות את פרופיל הסוויט.",
    addService: "הוסף",
    newService: "שירות או מוצר חדש",
    newKeyword: "מילת מפתח חדשה",
    addKeyword: "הוסף מילת מפתח",
    moveKeywordUp: "העלה מילת מפתח",
    moveKeywordDown: "הורד מילת מפתח",
    removeKeyword: "מחק מילת מפתח",
    emptyServices: "עדיין אין שירותים. הוסף שירות ראשון כדי לתת הקשר לשלבים הבאים.",
    keywordsTitle: "מילות מפתח",
    keywordsDesc: "יצירת מילות מפתח לפי קטגוריית העסק, השירותים והשפה.",
    competitorsTitle: "מתחרים",
    competitorsDesc: "חיפוש לפי מקור והפרדה בין Google Organic, Maps ופלטפורמות חברתיות.",
    demandTitle: "ביקוש והיצע",
    demandDesc: "קריאת ביקוש ותחרות מ-Google Ads Keyword Planner לפי מדינה, שפה ומילות מפתח.",
    personasTitle: "פרסונות לקוחות",
    personasDesc: "בניית פרופילים של לקוחות פוטנציאליים וחיבור הצורך להצעה השיווקית.",
    pdfTitle: "קובץ PDF לתכנית",
    pdfDesc: "הכנת קובץ PDF להורדה מכל החלקים שנוצרו.",
    showIntro: "הצג הסבר על התכנית",
    hideIntro: "הסתר הסבר על התכנית",
    downloadPdf: "הורד PDF",
    generate: "Generate",
    generateMore: "Generate More",
    openStage: "פתח עמוד",
    copy: "העתק",
    copied: "הועתק",
    preview: "תצוגה",
    close: "סגור",
    open: "פתח",
    locked: "נעול עד יצירה",
    noKeywords: "עדיין לא נוצרו מילות מפתח.",
    noCompetitors: "עדיין לא נוצרו מתחרים.",
    noSourceCompetitors: "אין תוצאות ממקור זה.",
    newCompetitorName: "שם המתחרה",
    newCompetitorUrl: "קישור למתחרה",
    newCompetitorDescription: "תיאור קצר או הערה",
    addCompetitor: "הוסף מתחרה",
    cancel: "ביטול",
    moveCompetitorUp: "העלה מתחרה",
    moveCompetitorDown: "הורד מתחרה",
    sourceOverview: "הצג את כל המקורות",
    noDemand: "ביקוש והיצע עדיין לא נוצרו.",
    noPersonas: "עדיין לא נוצרו פרסונות לקוחות.",
    loadingMorePersonas: "טוען עוד פרסונות לקוחות...",
    demandAvg: "ביקוש ממוצע",
    demandCompetition: "תחרות",
    marketPressure: "לחץ שוק",
    suggestedKeywords: "הצעות Google",
    keyword: "מילת מפתח",
    source: "מקור",
    searches: "חיפושים חודשיים",
    competition: "תחרות",
    bidRange: "טווח קליק",
    demandSignals: "ביקוש",
    supplySignals: "היצע",
    opportunitySignals: "הזדמנויות",
    showAll: "הצג הכל",
    collapse: "כווץ",
    notCompetitor: "לא מתחרה",
    goodCompetitor: "מתחרה טוב",
    localCompetitor: "מתחרה מקומי",
    globalCompetitor: "מתחרה גלובלי",
    age: "גיל",
    gender: "מגדר",
    profession: "מקצוע",
    economicStatus: "מצב כלכלי",
    challenge: "אתגר",
    need: "צורך",
    motivation: "מוטיבציה",
    solution: "פתרון ההצעה",
    pdfNeedsPersonas: "צרו קודם פרסונות לקוחות כדי שקובץ התכנית יהיה מוכן להורדה.",
  },
};

const tagLabels = (text: typeof labels.en) => ({
  not_competitor: text.notCompetitor,
  good_competitor: text.goodCompetitor,
  local_competitor: text.localCompetitor,
  global_competitor: text.globalCompetitor,
});

const competitorSourceOrder = ["google_organic", "maps", "instagram", "facebook", "tiktok", "google_sponsored", "sponsored", "other"];

const competitorSourceLabels: Record<string, string> = {
  google_organic: "Google Organic",
  maps: "Google Maps",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  google_sponsored: "Google Sponsored",
  sponsored: "Google Sponsored",
  other: "Other",
};

const stageTones: Record<StageSlug, { section: string; icon: string; accent: string }> = {
  services: {
    section: "border-sky-200/80 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(255,255,255,0)_42%)] dark:border-sky-500/20 dark:bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(0,0,0,0)_42%)]",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
    accent: "bg-sky-500",
  },
  keywords: {
    section: "border-violet-200/80 bg-[linear-gradient(135deg,rgba(139,92,246,0.08),rgba(255,255,255,0)_42%)] dark:border-violet-500/20 dark:bg-[linear-gradient(135deg,rgba(139,92,246,0.14),rgba(0,0,0,0)_42%)]",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
    accent: "bg-violet-500",
  },
  competitors: {
    section: "border-amber-200/80 bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(255,255,255,0)_42%)] dark:border-amber-500/20 dark:bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(0,0,0,0)_42%)]",
    icon: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    accent: "bg-amber-500",
  },
  "demand-supply": {
    section: "border-emerald-200/80 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0)_42%)] dark:border-emerald-500/20 dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(0,0,0,0)_42%)]",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    accent: "bg-emerald-500",
  },
  personas: {
    section: "border-rose-200/80 bg-[linear-gradient(135deg,rgba(244,63,94,0.08),rgba(255,255,255,0)_42%)] dark:border-rose-500/20 dark:bg-[linear-gradient(135deg,rgba(244,63,94,0.14),rgba(0,0,0,0)_42%)]",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
    accent: "bg-rose-500",
  },
  pdf: {
    section: "border-indigo-200/80 bg-[linear-gradient(135deg,rgba(99,102,241,0.08),rgba(255,255,255,0)_42%)] dark:border-indigo-500/20 dark:bg-[linear-gradient(135deg,rgba(99,102,241,0.14),rgba(0,0,0,0)_42%)]",
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200",
    accent: "bg-indigo-500",
  },
};

function shortUrl(url?: string) {
  if (!url) return "-";
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.hostname}${path}`.slice(0, 42);
  } catch {
    return url.slice(0, 42);
  }
}

function SourceGlyph({ source }: { source?: string }) {
  const type = `${source || ""}`.toLowerCase();
  if (type.includes("instagram")) return <Camera size={15} />;
  if (type.includes("maps")) return <MapPinned size={15} />;
  if (type.includes("facebook")) return <Globe2 size={15} />;
  if (type.includes("tiktok")) return <FileSearch size={15} />;
  if (type.includes("sponsored")) return <Target size={15} />;
  return <Search size={15} />;
}

function SourceIcon({ competitor }: { competitor: MarketingCompetitor }) {
  return <SourceGlyph source={`${competitor.result_type || competitor.platform}`} />;
}

export function MarketingPlanStages({ suiteId, stage }: { suiteId: string; stage?: StageSlug }) {
  const { lang, dir, t } = useLanguage();
  const baseText = labels[lang as keyof typeof labels] || labels.en;
  const text = useMemo(() => withAdminTextOverrides(baseText, t), [baseText, t]);
  const [suite, setSuite] = useState<Suite | null>(null);
  const [intelligence, setIntelligence] = useState<MarketingIntelligence | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState("");
  const [showIntro, setShowIntro] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const [suiteRes, planRes] = await Promise.all([api.suites.get(suiteId), api.marketingPlans.get(suiteId)]);
    setSuite(suiteRes);
    setIntelligence(planRes.intelligence || null);
  }, [suiteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((e) => setError(e instanceof Error ? e.message : "Request failed"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const brand = useMemo(() => (suite?.brand || {}) as Brand, [suite?.brand]);
  const services = useMemo(() => {
    const strategy = (suite?.strategy || {}) as Record<string, unknown>;
    const marketingPlan = (strategy.marketing_plan || {}) as Record<string, unknown>;
    const toList = (value: unknown) => Array.isArray(value) ? value : value ? [value] : [];
    const values = [
      ...toList(brand.services),
      ...toList(brand.products),
      ...toList((brand as Record<string, unknown>).products_services),
      ...toList(strategy.services),
      ...toList(strategy.products),
      ...toList(strategy.products_services),
      ...toList(marketingPlan.services),
      ...toList(marketingPlan.products),
      ...toList(marketingPlan.products_services),
    ];
    const seen = new Set<string>();
    return values
      .map((item) => String(item || "").trim())
      .filter((item) => {
        const marker = item.toLocaleLowerCase();
        if (!marker || seen.has(marker)) return false;
        seen.add(marker);
        return true;
      });
  }, [brand, suite?.strategy]);

  function applyPlanResponse(res: MarketingPlanResponse) {
    setIntelligence(res.intelligence || null);
  }

  async function saveServices(next: string[]) {
    if (!suite) return;
    setBusy("save-services");
    setError("");
    const nextBrand = { ...(suite.brand || {}), services: next, products: [] } as Brand;
    try {
      await api.suites.updateBrand(suiteId, nextBrand);
      setSuite({ ...suite, brand: nextBrand });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveKeywords(next: MarketingKeyword[]) {
    setBusy("save-keywords");
    setError("");
    try {
      const res = await api.marketingPlans.updateKeywords(suiteId, { keywords: next });
      applyPlanResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveCompetitors(next: MarketingCompetitor[]) {
    setBusy("save-competitors");
    setError("");
    try {
      const res = await api.marketingPlans.updateCompetitors(suiteId, { competitors: next });
      applyPlanResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function run(action: BusyAction, fn: () => Promise<MarketingPlanResponse>) {
    setBusy(action);
    setError("");
    try {
      applyPlanResponse(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function generatePersonasInitial() {
    setBusy("personas");
    setError("");
    try {
      const firstBatch = await api.marketingPlans.generatePersonas(suiteId, { language: lang });
      applyPlanResponse(firstBatch);
      const firstPersonas = firstBatch.intelligence?.personas || [];
      if (firstPersonas.length === 0) return;
      setBusy("personas-more");
      const secondBatch = await api.marketingPlans.generateMorePersonas(suiteId, {
        language: lang,
        existing_values: firstPersonas.map((persona) => persona.name || persona.id).filter(Boolean),
      });
      applyPlanResponse(secondBatch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateMorePersonas() {
    const existing = intelligence?.personas || [];
    await run("personas-more", () =>
      api.marketingPlans.generateMorePersonas(suiteId, {
        language: lang,
        existing_values: existing.map((persona) => persona.name || persona.id).filter(Boolean),
      })
    );
  }

  async function downloadPdf() {
    setBusy("pdf");
    setError("");
    try {
      const { blob, filename } = await api.marketingPlans.downloadPdf(suiteId);
      const file = new File([blob], filename, { type: blob.type || "application/pdf" });
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: filename,
          });
          return;
        } catch (shareError) {
          const name = shareError instanceof DOMException ? shareError.name : "";
          if (name === "AbortError" || String(shareError).toLowerCase().includes("abort")) {
            // If the native share sheet is canceled or blocked, keep the PDF flow alive
            // by falling back to the regular browser download below.
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  const allStages = (
    <div className="w-full min-w-0 overflow-x-hidden space-y-4" dir={dir}>
      <ServicesStage text={text} suiteId={suiteId} services={services} saving={busy === "save-services"} onSave={saveServices} />
      <KeywordsStage
        text={text}
        suiteId={suiteId}
        keywords={intelligence?.keywords || []}
        loading={busy === "keywords"}
        loadingMore={busy === "keywords-more"}
        saving={busy === "save-keywords"}
        onGenerate={() => run("keywords", () => api.marketingPlans.generateKeywords(suiteId, { language: lang }))}
        onMore={() => run("keywords-more", () => api.marketingPlans.generateMoreKeywords(suiteId, { language: lang, existing_values: (intelligence?.keywords || []).map((k) => k.text) }))}
        onSave={saveKeywords}
      />
      <CompetitorsStage
        text={text}
        suiteId={suiteId}
        competitors={intelligence?.competitors || []}
        warnings={intelligence?.source_warnings || intelligence?.warnings || []}
        loading={busy === "competitors"}
        loadingMore={busy === "competitors-more"}
        saving={busy === "save-competitors"}
        onGenerate={() => run("competitors", () => api.marketingPlans.generateCompetitors(suiteId, { language: lang }))}
        onMore={() => run("competitors-more", () => api.marketingPlans.generateMoreCompetitors(suiteId, { language: lang, existing_ids: (intelligence?.competitors || []).map((c) => c.id), existing_values: (intelligence?.competitors || []).map((c) => c.url || c.name) }))}
        onTagsChange={(competitorId, tags) => run("competitors", () => api.marketingPlans.updateCompetitor(suiteId, competitorId, { classification_tags: tags }))}
        onSave={saveCompetitors}
      />
      <DemandSupplyStage
        text={text}
        suiteId={suiteId}
        intelligence={intelligence}
        loading={busy === "demand-supply"}
        onGenerate={() => run("demand-supply", () => api.marketingPlans.generateDemandSupply(suiteId, { language: lang }))}
      />
      <PersonasStage
        text={text}
        suiteId={suiteId}
        personas={intelligence?.personas || []}
        loading={busy === "personas"}
        loadingMore={busy === "personas-more"}
        onGenerate={generatePersonasInitial}
        onMore={generateMorePersonas}
      />
      <MarketingPdfStage
        text={text}
        suiteId={suiteId}
        ready={(intelligence?.personas || []).length > 0}
        loading={busy === "pdf"}
        onDownload={downloadPdf}
      />
    </div>
  );

  if (!suite && !error) {
    return <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin" /></div>;
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-5" dir={dir}>
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h1 className="os-text-wrap text-2xl font-black text-foreground">{text.title}</h1>
          <button
            type="button"
            aria-label={showIntro ? text.hideIntro : text.showIntro}
            title={showIntro ? text.hideIntro : text.showIntro}
            aria-expanded={showIntro}
            onClick={() => setShowIntro((value) => !value)}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm shadow-sm transition ${showIntro ? "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]" : "border-border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Info size={16} />
          </button>
        </div>
        {showIntro && (
          <p className="os-text-wrap mt-3 rounded-xl border border-border bg-background/70 p-3 text-sm leading-6 text-muted-foreground">
            {text.desc}
          </p>
        )}
      </div>
      {error && <div className="os-text-wrap rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">{error}</div>}
      {stage === "services" && <ServicesStage text={text} suiteId={suiteId} services={services} saving={busy === "save-services"} onSave={saveServices} detail />}
      {stage === "keywords" && (
        <KeywordsStage text={text} suiteId={suiteId} keywords={intelligence?.keywords || []} loading={busy === "keywords"} loadingMore={busy === "keywords-more"} saving={busy === "save-keywords"} onGenerate={() => run("keywords", () => api.marketingPlans.generateKeywords(suiteId, { language: lang }))} onMore={() => run("keywords-more", () => api.marketingPlans.generateMoreKeywords(suiteId, { language: lang, existing_values: (intelligence?.keywords || []).map((k) => k.text) }))} onSave={saveKeywords} detail />
      )}
      {stage === "competitors" && (
        <CompetitorsStage text={text} suiteId={suiteId} competitors={intelligence?.competitors || []} warnings={intelligence?.source_warnings || intelligence?.warnings || []} loading={busy === "competitors"} loadingMore={busy === "competitors-more"} saving={busy === "save-competitors"} onGenerate={() => run("competitors", () => api.marketingPlans.generateCompetitors(suiteId, { language: lang }))} onMore={() => run("competitors-more", () => api.marketingPlans.generateMoreCompetitors(suiteId, { language: lang }))} onTagsChange={(competitorId, tags) => run("competitors", () => api.marketingPlans.updateCompetitor(suiteId, competitorId, { classification_tags: tags }))} onSave={saveCompetitors} detail />
      )}
      {stage === "demand-supply" && <DemandSupplyStage text={text} suiteId={suiteId} intelligence={intelligence} loading={busy === "demand-supply"} onGenerate={() => run("demand-supply", () => api.marketingPlans.generateDemandSupply(suiteId, { language: lang }))} detail />}
      {stage === "personas" && <PersonasStage text={text} suiteId={suiteId} personas={intelligence?.personas || []} loading={busy === "personas"} loadingMore={busy === "personas-more"} onGenerate={generatePersonasInitial} onMore={generateMorePersonas} detail />}
      {stage === "pdf" && <MarketingPdfStage text={text} suiteId={suiteId} ready={(intelligence?.personas || []).length > 0} loading={busy === "pdf"} onDownload={downloadPdf} detail />}
      {!stage && allStages}
    </div>
  );
}

function withAdminTextOverrides(base: typeof labels.en, t: (key: string) => string): typeof labels.en {
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => {
      const textKey = `marketingPlan.${key}`;
      const override = t(textKey);
      return [key, override === textKey ? value : override];
    })
  ) as typeof labels.en;
}

function StageBox({ title, description, icon, suiteId, slug, children, detail }: { title: string; description: string; icon: ReactNode; suiteId: string; slug: StageSlug; children: ReactNode; detail?: boolean }) {
  const tone = stageTones[slug];
  const [showDescription, setShowDescription] = useState(false);
  return (
    <section className={`relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5 ${tone.section}`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${tone.accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>{icon}</span>
          <div className="min-w-0">
            <h2 className="os-text-wrap text-xl font-black text-foreground">{title}</h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={showDescription ? `Hide ${title}` : `Info ${title}`}
            title={showDescription ? description : title}
            aria-expanded={showDescription}
            onClick={() => setShowDescription((value) => !value)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition ${showDescription ? "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]" : "border-border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Info size={15} />
          </button>
          {!detail && (
            <Link href={`/suite/${suiteId}/marketing-plan/${slug}`} aria-label={title} title={title} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/80 text-foreground shadow-sm hover:bg-muted">
              <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
      </div>
      {showDescription && (
        <p className="os-text-wrap mt-3 rounded-xl border border-border bg-background/70 p-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}

function ServicesStage({ text, suiteId, services, saving, onSave, detail }: { text: typeof labels.en; suiteId: string; services: string[]; saving: boolean; onSave: (next: string[]) => Promise<void>; detail?: boolean }) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const visibleServices = detail || expanded ? services : services.slice(0, 3);
  const hiddenServices = Math.max(0, services.length - visibleServices.length);

  async function add() {
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    await onSave([...services, value]);
  }

  async function remove(value: string) {
    await onSave(services.filter((item) => item !== value));
  }

  async function saveEdit(oldValue: string) {
    const value = editValue.trim();
    if (!value) return;
    setEditing(null);
    await onSave(services.map((item) => item === oldValue ? value : item));
  }

  return (
    <StageBox title={text.servicesTitle} description={text.servicesDesc} icon={<Package size={18} />} suiteId={suiteId} slug="services" detail={detail}>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={text.newService} dir="auto" onKeyDown={(e) => { if (e.key === "Enter") void add(); }} />
        <Button onClick={add} disabled={saving || !draft.trim()} className="w-full gap-2 sm:w-auto">{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{text.addService}</Button>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {services.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{text.emptyServices}</p> : visibleServices.map((service) => (
          <div key={service} className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background p-2">
            {editing === service ? (
              <>
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} dir="auto" className="min-w-0" />
                <Button size="sm" variant="outline" onClick={() => saveEdit(service)}><Check size={14} /></Button>
              </>
            ) : (
              <>
                <span className="os-text-wrap min-w-0 flex-1 text-sm font-semibold" dir="auto">{service}</span>
                <Button size="sm" variant="outline" onClick={() => { setEditing(service); setEditValue(service); }}><Pencil size={14} /></Button>
                <Button size="sm" variant="outline" onClick={() => remove(service)}><Trash2 size={14} /></Button>
              </>
            )}
          </div>
        ))}
      </div>
      {hiddenServices > 0 && !detail && (
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)} className="mt-3">
          {text.showAll} +{hiddenServices}
        </Button>
      )}
      {expanded && !detail && services.length > 3 && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)} className="mt-2">
          {text.collapse}
        </Button>
      )}
    </StageBox>
  );
}

function KeywordsStage({
  text,
  suiteId,
  keywords,
  loading,
  loadingMore,
  saving,
  onGenerate,
  onMore,
  onSave,
  detail,
}: {
  text: typeof labels.en;
  suiteId: string;
  keywords: MarketingKeyword[];
  loading: boolean;
  loadingMore: boolean;
  saving: boolean;
  onGenerate: () => void;
  onMore: () => void;
  onSave: (next: MarketingKeyword[]) => Promise<void>;
  detail?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const visibleKeywords = expanded || detail ? keywords : keywords.slice(0, 10);
  const isBusy = loading || loadingMore || saving;

  async function addKeyword() {
    const textValue = draft.trim();
    if (!textValue) return;
    const exists = keywords.some((keyword) => keyword.text.trim().toLocaleLowerCase() === textValue.toLocaleLowerCase());
    setDraft("");
    if (exists) return;
    await onSave([
      ...keywords,
      {
        id: `kw-manual-${Date.now()}`,
        text: textValue,
        intent: "manual",
        source: "manual",
        confidence: "manual",
      },
    ]);
  }

  async function moveKeyword(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= keywords.length) return;
    const next = [...keywords];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    await onSave(next);
  }

  async function removeKeyword(id: string) {
    await onSave(keywords.filter((keyword) => keyword.id !== id));
  }

  return (
    <StageBox title={text.keywordsTitle} description={text.keywordsDesc} icon={<FileSearch size={18} />} suiteId={suiteId} slug="keywords" detail={detail}>
      <div className="flex min-w-0 flex-wrap gap-2">
        <Button onClick={onGenerate} disabled={isBusy} className="gap-2">{loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}{text.generate}</Button>
        {keywords.length > 0 && <Button variant="outline" onClick={onMore} disabled={isBusy} className="gap-2">{loadingMore ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{text.generateMore}</Button>}
      </div>
      <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={text.newKeyword} dir="auto" onKeyDown={(e) => { if (e.key === "Enter") void addKeyword(); }} />
        <Button type="button" variant="outline" onClick={addKeyword} disabled={isBusy || !draft.trim()} className="w-full gap-2 sm:w-auto">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {text.addKeyword}
        </Button>
      </div>
      <div className={`relative mt-4 flex min-w-0 flex-wrap gap-2 overflow-hidden transition-[max-height] ${expanded || detail ? "max-h-none" : "max-h-[8.4rem]"}`}>
        {keywords.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{text.noKeywords}</p> : visibleKeywords.map((keyword) => (
          <span key={keyword.id} className="os-text-wrap inline-flex max-w-full items-center gap-1 rounded-2xl border border-border bg-background px-2 py-1.5 text-sm leading-5 shadow-sm" dir="auto">
            <span className="min-w-0 px-1 font-semibold">{keyword.text}</span>
            <button type="button" aria-label={text.moveKeywordUp} title={text.moveKeywordUp} disabled={isBusy || keywords.indexOf(keyword) === 0} onClick={() => moveKeyword(keywords.indexOf(keyword), -1)} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
              <ArrowUp size={13} />
            </button>
            <button type="button" aria-label={text.moveKeywordDown} title={text.moveKeywordDown} disabled={isBusy || keywords.indexOf(keyword) === keywords.length - 1} onClick={() => moveKeyword(keywords.indexOf(keyword), 1)} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
              <ArrowDown size={13} />
            </button>
            <button type="button" aria-label={text.removeKeyword} title={text.removeKeyword} disabled={isBusy} onClick={() => removeKeyword(keyword.id)} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30">
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      {keywords.length > 10 && !detail && (
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((value) => !value)} className="mt-3">
          {expanded ? text.collapse : text.showAll}
        </Button>
      )}
    </StageBox>
  );
}

function competitorGroupKey(competitor: MarketingCompetitor) {
  const key = `${competitor.result_type || competitor.platform || "other"}`.toLowerCase();
  return key === "google" ? "google_organic" : key;
}

function CompetitorsStage({
  text,
  suiteId,
  competitors,
  warnings,
  loading,
  loadingMore,
  saving,
  onGenerate,
  onMore,
  onTagsChange,
  onSave,
  detail,
}: {
  text: typeof labels.en;
  suiteId: string;
  competitors: MarketingCompetitor[];
  warnings: string[];
  loading: boolean;
  loadingMore: boolean;
  saving: boolean;
  onGenerate: () => void;
  onMore: () => void;
  onTagsChange: (id: string, tags: string[]) => void;
  onSave: (next: MarketingCompetitor[]) => Promise<void>;
  detail?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingSource, setAddingSource] = useState<string | null>(null);
  const [manual, setManual] = useState({ name: "", url: "", snippet: "" });
  const isBusy = loading || loadingMore || saving;
  const grouped = useMemo(() => {
    const groups = new Map<string, MarketingCompetitor[]>();
    for (const competitor of competitors) {
      const normalized = competitorGroupKey(competitor);
      groups.set(normalized, [...(groups.get(normalized) || []), competitor]);
    }
    const primarySources = competitorSourceOrder.slice(0, 5).map((source) => [source, groups.get(source) || []] as [string, MarketingCompetitor[]]);
    const extraSources = [...groups.entries()].filter(([source]) => !competitorSourceOrder.slice(0, 5).includes(source));
    return [...primarySources, ...extraSources].sort(([a], [b]) => {
      const indexA = competitorSourceOrder.indexOf(a);
      const indexB = competitorSourceOrder.indexOf(b);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }, [competitors]);
  const firstPreviewGroup = grouped.find(([, items]) => items.length > 0) || grouped[0];
  const visibleGroups = detail || expanded || !firstPreviewGroup ? grouped : [firstPreviewGroup];
  const nonEmptyGroupCount = grouped.filter(([, items]) => items.length > 0).length;
  const hiddenGroupCount = Math.max(0, nonEmptyGroupCount - visibleGroups.filter(([, items]) => items.length > 0).length);

  async function addManualCompetitor(source: string) {
    const name = manual.name.trim();
    if (!name) return;
    const newCompetitor: MarketingCompetitor = {
      id: `competitor-manual-${Date.now()}`,
      name,
      title: name,
      platform: source,
      result_type: source,
      url: manual.url.trim(),
      snippet: manual.snippet.trim(),
      reason: manual.snippet.trim(),
      confidence: "manual",
      classification_tags: [],
    };
    setManual({ name: "", url: "", snippet: "" });
    setAddingSource(null);
    await onSave([...competitors, newCompetitor]);
  }

  async function moveCompetitor(competitor: MarketingCompetitor, direction: -1 | 1) {
    const source = competitorGroupKey(competitor);
    const sourceItems = competitors.filter((item) => competitorGroupKey(item) === source);
    const index = sourceItems.findIndex((item) => item.id === competitor.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sourceItems.length) return;
    const reorderedSource = [...sourceItems];
    const [item] = reorderedSource.splice(index, 1);
    reorderedSource.splice(target, 0, item);
    const queue = [...reorderedSource];
    await onSave(competitors.map((item) => (competitorGroupKey(item) === source ? queue.shift() || item : item)));
  }

  return (
    <StageBox title={text.competitorsTitle} description={text.competitorsDesc} icon={<Search size={18} />} suiteId={suiteId} slug="competitors" detail={detail}>
      <div className="flex min-w-0 flex-wrap gap-2">
        <Button onClick={onGenerate} disabled={isBusy} className="gap-2">{loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}{text.generate}</Button>
        {competitors.length > 0 && <Button variant="outline" onClick={onMore} disabled={isBusy} className="gap-2">{loadingMore ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{text.generateMore}</Button>}
      </div>
      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.slice(0, 4).map((warning, index) => (
            <p key={`${warning}-${index}`} className="os-text-wrap rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" dir="auto">{warning}</p>
          ))}
        </div>
      )}
      <div className="mt-4 space-y-5">
        {competitors.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{text.noCompetitors}</p>
        ) : visibleGroups.map(([source, items]) => (
          <section key={source} className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">{competitorSourceLabels[source] || source}</h3>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{items.length}</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setAddingSource((current) => current === source ? null : source)} disabled={isBusy} className="h-8 gap-1 px-2 text-xs">
                <Plus size={13} />
                {text.addCompetitor}
              </Button>
            </div>
            {addingSource === source && (
              <div className="mb-3 grid gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/10 sm:grid-cols-[1fr_1fr_auto]">
                <Input value={manual.name} onChange={(e) => setManual((value) => ({ ...value, name: e.target.value }))} placeholder={text.newCompetitorName} dir="auto" />
                <Input value={manual.url} onChange={(e) => setManual((value) => ({ ...value, url: e.target.value }))} placeholder={text.newCompetitorUrl} dir="ltr" />
                <div className="flex gap-2 sm:row-span-2 sm:flex-col">
                  <Button type="button" onClick={() => addManualCompetitor(source)} disabled={isBusy || !manual.name.trim()} className="h-10 gap-2">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    {text.addCompetitor}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setAddingSource(null)} className="h-10">{text.cancel}</Button>
                </div>
                <Input value={manual.snippet} onChange={(e) => setManual((value) => ({ ...value, snippet: e.target.value }))} placeholder={text.newCompetitorDescription} dir="auto" className="sm:col-span-2" />
              </div>
            )}
            <div className="os-scroll-x flex snap-x gap-3 pb-2">
              {items.length === 0 ? (
                <p className="w-[76%] max-w-80 shrink-0 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground sm:w-80">{text.noSourceCompetitors}</p>
              ) : items.map((competitor, index) => (
                <div key={competitor.id} className="w-[76%] max-w-80 shrink-0 snap-start sm:w-80">
                  <CompetitorCard
                    text={text}
                    competitor={competitor}
                    onTagsChange={onTagsChange}
                    onMoveUp={() => moveCompetitor(competitor, -1)}
                    onMoveDown={() => moveCompetitor(competitor, 1)}
                    moveUpDisabled={isBusy || index === 0}
                    moveDownDisabled={isBusy || index === items.length - 1}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {competitors.length > 0 && hiddenGroupCount > 0 && !detail && (
        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExpanded(true)}
            className="min-h-12 w-full max-w-xl justify-between gap-3 rounded-2xl border-amber-300 bg-amber-50/80 px-4 text-amber-950 shadow-sm hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
          >
            <span className="font-bold">{text.sourceOverview} +{hiddenGroupCount}</span>
            <span className="flex items-center gap-1.5">
              {competitorSourceOrder.slice(0, 5).map((source) => (
                <span key={source} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-amber-800 shadow-sm dark:bg-background/30 dark:text-amber-100" title={competitorSourceLabels[source]}>
                  <SourceGlyph source={source} />
                </span>
              ))}
            </span>
          </Button>
        </div>
      )}
      {expanded && !detail && hiddenGroupCount === 0 && grouped.length > 1 && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)} className="mt-2">
          {text.collapse}
        </Button>
      )}
    </StageBox>
  );
}

function CompetitorCard({
  text,
  competitor,
  onTagsChange,
  onMoveUp,
  onMoveDown,
  moveUpDisabled,
  moveDownDisabled,
}: {
  text: typeof labels.en;
  competitor: MarketingCompetitor;
  onTagsChange: (id: string, tags: string[]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  moveUpDisabled: boolean;
  moveDownDisabled: boolean;
}) {
  const [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const tagText = tagLabels(text);
  const tags = competitor.classification_tags || [];
  async function copyUrl() {
    if (!competitor.url) return;
    await navigator.clipboard.writeText(competitor.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  function toggleTag(tag: string) {
    const next = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
    onTagsChange(competitor.id, next);
  }
  return (
    <article className="relative min-w-0 overflow-hidden rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <SourceIcon competitor={competitor} />
            <span className="min-w-0 truncate">{competitor.result_type || competitor.platform}</span>
          </div>
          <h3 className="os-text-wrap font-bold text-foreground" dir="auto">{competitor.title || competitor.name}</h3>
          <p className="os-text-wrap mt-2 text-sm leading-6 text-muted-foreground" dir="auto">{competitor.snippet || competitor.reason || competitor.evidence}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button type="button" aria-label={text.moveCompetitorUp} title={text.moveCompetitorUp} disabled={moveUpDisabled} onClick={onMoveUp} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
            <ArrowUp size={13} />
          </button>
          <button type="button" aria-label={text.moveCompetitorDown} title={text.moveCompetitorDown} disabled={moveDownDisabled} onClick={onMoveDown} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
            <ArrowDown size={13} />
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="min-w-0 max-w-full truncate rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground" dir="ltr">{shortUrl(competitor.url)}</span>
        {competitor.url && <a href={competitor.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs font-semibold hover:bg-muted"><ArrowUpRight size={13} />{text.open}</a>}
        <Button type="button" size="sm" variant="outline" onClick={copyUrl} className="h-8 gap-1 px-2 text-xs"><Copy size={13} />{copied ? text.copied : text.copy}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setPreview(true)} className="h-8 gap-1 px-2 text-xs"><Eye size={13} />{text.preview}</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(tagText).map(([tag, label]) => (
          <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`os-text-wrap rounded-full border px-2.5 py-1 text-xs font-semibold ${tags.includes(tag) ? "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]" : "border-border text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>
      {preview && (
        <div className="absolute inset-x-3 top-3 z-10 min-w-0 rounded-xl border border-border bg-card p-3 shadow-lg sm:inset-x-4 sm:top-4">
          <div className="flex items-start justify-between gap-3">
            <p className="break-all text-xs text-muted-foreground" dir="ltr">{competitor.url || "-"}</p>
            <button type="button" onClick={() => setPreview(false)} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copyUrl} className="gap-1"><Copy size={13} />{text.copy}</Button>
            <Button type="button" size="sm" onClick={() => setPreview(false)}>{text.close}</Button>
          </div>
        </div>
      )}
    </article>
  );
}

function DemandSupplyStage({ text, suiteId, intelligence, loading, onGenerate, detail }: { text: typeof labels.en; suiteId: string; intelligence: MarketingIntelligence | null; loading: boolean; onGenerate: () => void; detail?: boolean }) {
  const demand = intelligence?.demand_signals || [];
  const supply = intelligence?.supply_signals || [];
  const opportunities = intelligence?.opportunities || [];
  const planner = intelligence?.demand_supply;
  const summary = planner?.summary;
  const keywordMetrics = planner?.keyword_metrics || [];
  const hasData = Boolean(summary?.analyzed_keywords || keywordMetrics.length || planner?.warning || demand.length || supply.length || opportunities.length);
  return (
    <StageBox title={text.demandTitle} description={text.demandDesc} icon={<Target size={18} />} suiteId={suiteId} slug="demand-supply" detail={detail}>
      <Button onClick={onGenerate} disabled={loading} className="gap-2">{loading ? <Loader2 size={15} className="animate-spin" /> : <Target size={15} />}{text.generate}</Button>
      {!hasData ? <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{text.noDemand}</p> : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <MetricTile label={text.demandAvg} value={`${summary?.average_monthly_searches || 0}`} helper={summary?.demand_level || ""} />
            <MetricTile label={text.demandCompetition} value={summary?.competition_level || "UNKNOWN"} helper={`${summary?.average_competition_index || 0}/100`} />
            <MetricTile label={text.marketPressure} value={`${summary?.market_pressure_score || 0}/100`} helper={`${summary?.analyzed_keywords || 0} keywords`} />
            <MetricTile label={text.suggestedKeywords} value={`${summary?.suggested_keywords || planner?.suggested_keywords?.length || 0}`} helper="Keyword Planner" />
          </div>
          {planner?.warning && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" dir="auto">{planner.warning}</p>}
          {keywordMetrics.length > 0 ? (
            <div className="os-scroll-x rounded-xl border border-border bg-background">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-start font-semibold">{text.keyword}</th>
                    <th className="px-3 py-2 text-start font-semibold">{text.source}</th>
                    <th className="px-3 py-2 text-start font-semibold">{text.searches}</th>
                    <th className="px-3 py-2 text-start font-semibold">{text.competition}</th>
                    <th className="px-3 py-2 text-start font-semibold">{text.bidRange}</th>
                  </tr>
                </thead>
                <tbody>
                  {keywordMetrics.slice(0, detail ? 80 : 8).map((item) => (
                    <tr key={`${item.keyword}-${item.source}`} className="border-t border-border">
                      <td className="os-text-wrap px-3 py-2 font-semibold text-foreground" dir="auto">{item.keyword}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.source || "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.average_monthly_searches ?? 0}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.competition || "UNKNOWN"} {item.competition_index ? `(${item.competition_index})` : ""}</td>
                      <td className="px-3 py-2 text-muted-foreground">${item.low_top_of_page_bid ?? 0} - ${item.high_top_of_page_bid ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <SignalList title={text.demandSignals} items={demand} />
              <SignalList title={text.supplySignals} items={supply} />
              <SignalList title={text.opportunitySignals} items={opportunities} />
            </div>
          )}
        </div>
      )}
    </StageBox>
  );
}

const personaAvatarColors = [
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
];

function personaColor(seed?: string) {
  const text = seed || "persona";
  let total = 0;
  for (let index = 0; index < text.length; index += 1) total += text.charCodeAt(index);
  return personaAvatarColors[total % personaAvatarColors.length];
}

function personaInitials(persona: MarketingPersona) {
  const words = String(persona.name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function PersonasStage({
  text,
  suiteId,
  personas,
  loading,
  loadingMore,
  onGenerate,
  onMore,
  detail,
}: {
  text: typeof labels.en;
  suiteId: string;
  personas: MarketingPersona[];
  loading: boolean;
  loadingMore: boolean;
  onGenerate: () => void;
  onMore: () => void;
  detail?: boolean;
}) {
  return (
    <StageBox title={text.personasTitle} description={text.personasDesc} icon={<UserRound size={18} />} suiteId={suiteId} slug="personas" detail={detail}>
      <div className="flex min-w-0 flex-wrap gap-2">
        <Button onClick={onGenerate} disabled={loading || loadingMore} className="gap-2">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <UserRound size={15} />}
          {text.generate}
        </Button>
        {personas.length > 0 && (
          <Button variant="outline" onClick={onMore} disabled={loading || loadingMore} className="gap-2">
            {loadingMore ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {text.generateMore}
          </Button>
        )}
      </div>
      {personas.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{text.noPersonas}</p>
      ) : (
        <div className="os-scroll-x mt-4 flex snap-x gap-3 pb-2">
          {personas.map((persona) => (
            <article key={persona.id} className="w-[78%] max-w-[22rem] shrink-0 snap-start rounded-xl border border-border bg-background p-4 sm:w-80">
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black ${personaColor(persona.avatar_seed)}`}>
                  {personaInitials(persona)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="os-text-wrap text-lg font-black text-foreground" dir="auto">{persona.name}</h3>
                  <p className="os-text-wrap mt-1 text-xs font-semibold text-muted-foreground" dir="auto">
                    {[persona.age ? `${text.age}: ${persona.age}` : "", persona.gender ? `${text.gender}: ${persona.gender}` : ""].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {persona.profession && <span className="os-text-wrap rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground" dir="auto">{text.profession}: {persona.profession}</span>}
                {persona.economic_status && <span className="os-text-wrap rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground" dir="auto">{text.economicStatus}: {persona.economic_status}</span>}
              </div>
              <div className="mt-4 space-y-3">
                <PersonaField label={text.challenge} value={persona.challenge} />
                <PersonaField label={text.need} value={persona.need} />
                <PersonaField label={text.motivation} value={persona.motivation} />
                <PersonaField label={text.solution} value={persona.solution} highlighted />
              </div>
            </article>
          ))}
          {loadingMore && (
            <article key="personas-loading-more" className="flex min-h-64 w-[78%] max-w-[22rem] shrink-0 snap-start flex-col items-center justify-center rounded-xl border border-dashed border-rose-200 bg-rose-50/60 p-4 text-center text-sm text-rose-900 sm:w-80 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100">
              <Loader2 size={22} className="mb-3 animate-spin" />
              <span className="os-text-wrap">{text.loadingMorePersonas}</span>
            </article>
          )}
        </div>
      )}
    </StageBox>
  );
}

function MarketingPdfStage({
  text,
  suiteId,
  ready,
  loading,
  onDownload,
  detail,
}: {
  text: typeof labels.en;
  suiteId: string;
  ready: boolean;
  loading: boolean;
  onDownload: () => void;
  detail?: boolean;
}) {
  return (
    <StageBox title={text.pdfTitle} description={text.pdfDesc} icon={<Download size={18} />} suiteId={suiteId} slug="pdf" detail={detail}>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onDownload} disabled={!ready || loading} className="gap-2">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {text.downloadPdf}
        </Button>
        {!ready && (
          <p className="os-text-wrap text-sm text-muted-foreground" dir="auto">
            {text.pdfNeedsPersonas}
          </p>
        )}
      </div>
    </StageBox>
  );
}

function PersonaField({ label, value, highlighted }: { label: string; value?: string; highlighted?: boolean }) {
  if (!value) return null;
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${highlighted ? "border-rose-200 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-500/10" : "border-border bg-card/60"}`}>
      <p className="text-[11px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="os-text-wrap mt-1 text-sm leading-6 text-foreground" dir="auto">{value}</p>
    </div>
  );
}

function MetricTile({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background p-3">
      <p className="os-text-wrap text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="os-text-wrap mt-2 text-2xl font-bold text-foreground" dir="auto">{value}</p>
      {helper && <p className="os-text-wrap mt-1 text-xs text-muted-foreground" dir="auto">{helper}</p>}
    </div>
  );
}

function SignalList({ title, items }: { title: string; items: Array<{ id: string; title: string }> }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background p-3">
      <h3 className="os-text-wrap font-bold text-foreground">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.slice(0, 6).map((item) => <p key={item.id} className="os-text-wrap text-sm leading-6 text-muted-foreground" dir="auto">{item.title}</p>)}
      </div>
    </div>
  );
}
