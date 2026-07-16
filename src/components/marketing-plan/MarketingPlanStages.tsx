"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Camera,
  Download,
  Eye,
  FileSearch,
  Globe2,
  Info,
  Loader2,
  MapPinned,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { ApiError, api, Brand, MarketingCompetitor, MarketingIntelligence, MarketingKeyword, MarketingPersona, MarketingPlanResponse, PlanVisual, Suite } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type StageSlug = "services" | "keywords" | "competitors" | "demand-supply" | "personas" | "message" | "pdf";
type BusyAction = StageSlug | "keywords-more" | "competitors-more" | "demand-supply-more" | "personas-more" | "save-services" | "save-keywords" | "save-competitors" | null;

const labels = {
  ar: {
    title: "الخطة التسويقية",
    desc: "مقسمة لمراحل عملية. كل مرحلة تولد أو تحفظ بياناتها بشكل مستقل.",
    showAll: "عرض الكل",
    collapseAll: "تصغير",
    coverKicker: "الخطة التسويقية",
    planEmptyTitle: "ما في خطة تسويقية بعد",
    planEmptyDesc: "بكبسة وحدة بنولّد الخطة قسم قسم: كلمات مفتاحية، منافسين، عرض وطلب، وشخصيات العملاء — كل قسم بظهر أول ما يجهز وبننتقل تلقائيًا للي بعده.",
    generateFullPlan: "توليد كل الخطة",
    preparingPlan: "عم نجهّز خطتك التسويقية…",
    preparingPlanHint: "الصفحة بتتحدث لحالها أول ما يجهز أول قسم — ما في داعي تعيد التحميل.",
    generatingNow: "عم نولّد:",
    stageFailed: "تعذّر توليد",
    retryStage: "أعد المحاولة",
    networkError: "انقطع اتصال جهازك بالإنترنت أثناء العملية — هاي مش مشكلة من عنا. تأكد من الاتصال وجرّب مرة ثانية.",
    funnelOneShot: "بمسار التجربة المجانية الرسالة بتتولد مرة واحدة — للتعديل أو إعادة التوليد تواصل معنا.",
    messageTitle: "الرسالة التسويقية",
    messageDesc: "خلاصة الخطة: الرسالة الأساسية اللي بتحكي فيها علامتك مع جمهورك.",
    generateMessage: "توليد الرسالة التسويقية",
    regenerateMessage: "إعادة توليد الرسالة",
    editMessage: "تعديل الرسالة",
    saveMessage: "حفظ",
    cancelEditMessage: "إلغاء",
    messageSaving: "عم نحفظ...",
    messagePlaceholder: "اكتب رسالتك التسويقية هون...",
    messageGenerating: "عم نولّد الرسالة التسويقية...",
    personasGenerating: "بعدنا عم نولّد شخصيات إضافية...",
    coverStatsKeywords: "كلمة مفتاحية",
    coverStatsCompetitors: "منافس",
    coverStatsPersonas: "شخصية",
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
    competitorsTitle: "عينة من المنافسين",
    competitorsDesc: "نبحث حسب المصدر ونفصل النتائج بين Google Organic وMaps والمنصات الاجتماعية.",
    demandTitle: "العرض والطلب",
    demandDesc: "نقرأ الطلب والمنافسة من Google Ads Keyword Planner حسب البلد واللغة والكلمات.",
    personasTitle: "عينة شخصيات محتملة من العملاء",
    personasDesc: "نبني بروفايلات عملاء محتملين ونربط الحاجة بالعرض التسويقي.",
    pdfTitle: "ملف الخطة التسويقية",
    downloadPlanPdf: "تحميل الخطة التسويقية PDF",
    goToWorkPlan: "الانتقال إلى خطة العمل",
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
    collapse: "إخفاء",
    notCompetitor: "غير منافس",
    goodCompetitor: "منافس جيد",
    localCompetitor: "منافس محلي",
    globalCompetitor: "منافس عالمي",
    nearbyBadge: "قريب منك",
    confirmedBadge: "منافس مؤكد",
    leadBadge: "نقطة بحث",
    reviewsWord: "تقييم",
    tagsLabel: "تصنيفك",
    demandIndicator: "متوسط الطلب",
    competitionIndicator: "المنافسة",
    byGoogle: "جوجل",
    bySocial: "سوشيال",
    levelHigh: "مرتفع",
    levelMedium: "متوسط",
    levelLow: "منخفض",
    levelHighF: "مرتفعة",
    levelMediumF: "متوسطة",
    levelLowF: "منخفضة",
    recAllPlatforms: "مفضّل التواجد على كل المنصات",
    recFocusSocial: "مفضّل التركيز على السوشيال ميديا",
    recFocusSearch: "مفضّل التركيز على البحث في جوجل",
    recBuildAwareness: "الطلب منخفض — ركّز على بناء الوعي والجمهور",
    recSeoOpportunity: "فرصة قوية SEO / GEO",
    recSocialGap: "منافسة ضعيفة على السوشيال — فرصة للريادة",
    recDifferentiate: "منافسة مرتفعة — ميّز عرضك ومحتواك",
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
    showAll: "Show all",
    collapseAll: "Collapse",
    coverKicker: "Marketing Plan",
    planEmptyTitle: "No marketing plan yet",
    planEmptyDesc: "One click generates the plan section by section: keywords, competitors, demand & supply, and customer personas — each section appears as soon as it is ready.",
    generateFullPlan: "Generate the full plan",
    preparingPlan: "Preparing your marketing plan…",
    preparingPlanHint: "The page updates by itself as soon as the first section is ready — no need to reload.",
    generatingNow: "Generating:",
    stageFailed: "Failed to generate",
    retryStage: "Try again",
    networkError: "Your device lost its internet connection during the operation — this is not a problem on our side. Check your connection and try again.",
    funnelOneShot: "On the free trial journey the message is generated once — contact us to adjust or regenerate it.",
    messageTitle: "Marketing message",
    messageDesc: "The plan's essence: the core message your brand speaks to its audience.",
    generateMessage: "Generate the marketing message",
    regenerateMessage: "Regenerate the message",
    editMessage: "Edit message",
    saveMessage: "Save",
    cancelEditMessage: "Cancel",
    messageSaving: "Saving...",
    messagePlaceholder: "Write your marketing message here...",
    messageGenerating: "Generating the marketing message...",
    personasGenerating: "Still generating more personas...",
    coverStatsKeywords: "keywords",
    coverStatsCompetitors: "competitors",
    coverStatsPersonas: "personas",
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
    competitorsTitle: "A Sample of Competitors",
    competitorsDesc: "Search by source and split results across Google Organic, Maps, and social platforms.",
    demandTitle: "Demand and Supply",
    demandDesc: "Read demand and competition from Google Ads Keyword Planner by country, language, and keywords.",
    personasTitle: "Sample Potential Customer Personas",
    personasDesc: "Build potential customer profiles and connect their needs to the marketing offer.",
    pdfTitle: "Marketing Plan PDF",
    downloadPlanPdf: "Download the marketing plan PDF",
    goToWorkPlan: "Go to the work plan",
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
    collapse: "Collapse",
    notCompetitor: "Not a competitor",
    goodCompetitor: "Good competitor",
    localCompetitor: "Local competitor",
    globalCompetitor: "Global competitor",
    nearbyBadge: "Near you",
    confirmedBadge: "Confirmed competitor",
    leadBadge: "Research lead",
    reviewsWord: "reviews",
    tagsLabel: "Your rating",
    demandIndicator: "Market demand",
    competitionIndicator: "Competition",
    byGoogle: "Google",
    bySocial: "Social",
    levelHigh: "High",
    levelMedium: "Medium",
    levelLow: "Low",
    levelHighF: "High",
    levelMediumF: "Medium",
    levelLowF: "Low",
    recAllPlatforms: "Best to be present on all platforms",
    recFocusSocial: "Best to focus on social media",
    recFocusSearch: "Best to focus on Google search",
    recBuildAwareness: "Low demand — focus on awareness and audience building",
    recSeoOpportunity: "Strong SEO / GEO opportunity",
    recSocialGap: "Weak social competition — opportunity to lead",
    recDifferentiate: "High competition — differentiate your offer and content",
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
    showAll: "הצג הכל",
    collapseAll: "כווץ",
    coverKicker: "התכנית השיווקית",
    planEmptyTitle: "עדיין אין תכנית שיווקית",
    planEmptyDesc: "בלחיצה אחת נבנה את התכנית שלב אחרי שלב: מילות מפתח, מתחרים, ביקוש והיצע ופרסונות — כל שלב מופיע ברגע שהוא מוכן.",
    generateFullPlan: "צור את כל התכנית",
    preparingPlan: "מכינים את התכנית השיווקית שלך…",
    preparingPlanHint: "העמוד מתעדכן לבד ברגע שהחלק הראשון מוכן — אין צורך לרענן.",
    generatingNow: "יוצרים:",
    stageFailed: "יצירה נכשלה",
    retryStage: "נסו שוב",
    networkError: "חיבור האינטרנט של המכשיר נותק במהלך הפעולה — זו לא תקלה אצלנו. בדקו את החיבור ונסו שוב.",
    funnelOneShot: "במסלול ההתנסות המסר נוצר פעם אחת — צרו קשר כדי לעדכן או ליצור מחדש.",
    messageTitle: "המסר השיווקי",
    messageDesc: "תמצית התכנית: המסר המרכזי שהמותג שלך מדבר עם הקהל.",
    generateMessage: "צור את המסר השיווקי",
    regenerateMessage: "צור מסר מחדש",
    editMessage: "עריכת המסר",
    saveMessage: "שמירה",
    cancelEditMessage: "ביטול",
    messageSaving: "שומרים...",
    messagePlaceholder: "כתוב כאן את המסר השיווקי שלך...",
    messageGenerating: "יוצרים את המסר השיווקי...",
    personasGenerating: "עדיין יוצרים פרסונות נוספות...",
    coverStatsKeywords: "מילות מפתח",
    coverStatsCompetitors: "מתחרים",
    coverStatsPersonas: "פרסונות",
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
    competitorsTitle: "מדגם מתחרים",
    competitorsDesc: "חיפוש לפי מקור והפרדה בין Google Organic, Maps ופלטפורמות חברתיות.",
    demandTitle: "ביקוש והיצע",
    demandDesc: "קריאת ביקוש ותחרות מ-Google Ads Keyword Planner לפי מדינה, שפה ומילות מפתח.",
    personasTitle: "דוגמת פרסונות לקוחות פוטנציאליים",
    personasDesc: "בניית פרופילים של לקוחות פוטנציאליים וחיבור הצורך להצעה השיווקית.",
    pdfTitle: "קובץ PDF לתכנית",
    downloadPlanPdf: "הורדת תוכנית השיווק PDF",
    goToWorkPlan: "מעבר לתוכנית העבודה",
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
    collapse: "כווץ",
    notCompetitor: "לא מתחרה",
    goodCompetitor: "מתחרה טוב",
    localCompetitor: "מתחרה מקומי",
    globalCompetitor: "מתחרה גלובלי",
    nearbyBadge: "קרוב אליך",
    confirmedBadge: "מתחרה מאומת",
    leadBadge: "כיוון מחקר",
    reviewsWord: "ביקורות",
    tagsLabel: "הסיווג שלך",
    demandIndicator: "ביקוש בשוק",
    competitionIndicator: "תחרות",
    byGoogle: "גוגל",
    bySocial: "סושיאל",
    levelHigh: "גבוה",
    levelMedium: "בינוני",
    levelLow: "נמוך",
    levelHighF: "גבוהה",
    levelMediumF: "בינונית",
    levelLowF: "נמוכה",
    recAllPlatforms: "מומלץ נוכחות בכל הפלטפורמות",
    recFocusSocial: "מומלץ להתמקד בסושיאל",
    recFocusSearch: "מומלץ להתמקד בחיפוש בגוגל",
    recBuildAwareness: "ביקוש נמוך — התמקדו בבניית מודעות וקהל",
    recSeoOpportunity: "הזדמנות חזקה ב־SEO / GEO",
    recSocialGap: "תחרות חלשה בסושיאל — הזדמנות להוביל",
    recDifferentiate: "תחרות גבוהה — בדלו את ההצעה והתוכן",
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

const competitorTagPriority = ["good_competitor", "local_competitor", "global_competitor"];

function normalizeCompetitorTags(tags: string[]) {
  if (tags.includes("not_competitor")) return ["not_competitor"];
  return competitorTagPriority.filter((tag) => tags.includes(tag));
}

function competitorScore(competitor: MarketingCompetitor) {
  const tags = normalizeCompetitorTags(competitor.classification_tags || []);
  if (tags.includes("not_competitor")) return -1;
  const countScore = tags.length * 100;
  const priorityScore = tags.reduce((score, tag) => score + (competitorTagPriority.length - competitorTagPriority.indexOf(tag)), 0);
  return countScore + priorityScore;
}

const competitorSourceOrder = ["google_organic", "instagram", "maps", "facebook", "tiktok", "google_sponsored", "sponsored", "other"];

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
  message: {
    section: "border-blue-200/80 bg-[linear-gradient(135deg,rgba(47,128,255,0.08),rgba(255,255,255,0)_42%)] dark:border-blue-500/20 dark:bg-[linear-gradient(135deg,rgba(47,128,255,0.14),rgba(0,0,0,0)_42%)]",
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
    accent: "bg-blue-500",
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

const competitorPlatformStyles: Record<string, { bar: string; avatar: string; chip: string }> = {
  instagram: {
    bar: "bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400",
    avatar: "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400",
    chip: "border-pink-300/60 bg-pink-50 text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-200",
  },
  facebook: {
    bar: "bg-[#1877F2]",
    avatar: "bg-[#1877F2]",
    chip: "border-blue-300/60 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
  },
  tiktok: {
    bar: "bg-gradient-to-r from-cyan-400 via-slate-700 to-rose-500",
    avatar: "bg-slate-900",
    chip: "border-slate-400/60 bg-slate-100 text-slate-800 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-200",
  },
  maps: {
    bar: "bg-emerald-500",
    avatar: "bg-emerald-500",
    chip: "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  },
  google_organic: {
    bar: "bg-sky-500",
    avatar: "bg-sky-500",
    chip: "border-sky-300/60 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  },
  google_sponsored: {
    bar: "bg-amber-500",
    avatar: "bg-amber-500",
    chip: "border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  },
  other: {
    bar: "bg-slate-400",
    avatar: "bg-slate-500",
    chip: "border-border bg-muted text-muted-foreground",
  },
};

function competitorPlatformStyle(competitor: MarketingCompetitor) {
  const key = competitorGroupKey(competitor);
  return competitorPlatformStyles[key === "sponsored" ? "google_sponsored" : key] || competitorPlatformStyles.other;
}

type MarketLevel = "HIGH" | "MEDIUM" | "LOW" | undefined;

function normalizeMarketLevel(value?: string): MarketLevel {
  const level = `${value || ""}`.toUpperCase();
  return level === "HIGH" || level === "MEDIUM" || level === "LOW" ? level : undefined;
}

// good/mid/bad semantics: for demand HIGH is good; for competition LOW is good.
function marketLevelTone(level: MarketLevel, invert: boolean) {
  if (!level) return "bg-white/10 text-white/60";
  const good = invert ? "LOW" : "HIGH";
  const bad = invert ? "HIGH" : "LOW";
  if (level === good) return "bg-emerald-500/25 text-emerald-300";
  if (level === bad) return "bg-rose-500/25 text-rose-300";
  return "bg-amber-500/25 text-amber-300";
}

function buildMarketIndicators(intelligence: MarketingIntelligence | null, text: typeof labels.en) {
  const summary = intelligence?.demand_supply?.summary;
  const googleDemand = normalizeMarketLevel(summary?.demand_level);
  const googleCompetition = normalizeMarketLevel(summary?.competition_level);
  const socialDemand = normalizeMarketLevel(intelligence?.demand_supply?.social?.level);
  const competitors = intelligence?.competitors || [];
  const socialCompetitorCount = competitors.filter(
    (item) => !item.research_lead && /instagram|facebook|tiktok/.test(`${item.result_type || item.platform}`.toLowerCase())
  ).length;
  const socialCompetition: MarketLevel = competitors.length === 0
    ? undefined
    : socialCompetitorCount >= 5 ? "HIGH" : socialCompetitorCount >= 2 ? "MEDIUM" : "LOW";

  const demandRec = !googleDemand && !socialDemand
    ? ""
    : googleDemand === "HIGH" && socialDemand === "HIGH" ? text.recAllPlatforms
    : socialDemand === "HIGH" ? text.recFocusSocial
    : googleDemand === "HIGH" ? text.recFocusSearch
    : googleDemand === "LOW" && socialDemand === "LOW" ? text.recBuildAwareness
    : text.recAllPlatforms;
  const competitionRec = !googleCompetition && !socialCompetition
    ? ""
    : googleCompetition === "LOW" ? text.recSeoOpportunity
    : socialCompetition === "LOW" ? text.recSocialGap
    : googleCompetition === "HIGH" && socialCompetition === "HIGH" ? text.recDifferentiate
    : "";

  const levelLabel = (level: MarketLevel, feminine: boolean) => {
    if (!level) return "—";
    if (level === "HIGH") return feminine ? text.levelHighF : text.levelHigh;
    if (level === "MEDIUM") return feminine ? text.levelMediumF : text.levelMedium;
    return feminine ? text.levelLowF : text.levelLow;
  };

  const cards = [
    {
      key: "demand",
      title: text.demandIndicator,
      invert: false,
      feminine: false,
      google: googleDemand,
      social: socialDemand,
      recommendation: demandRec,
    },
    {
      key: "competition",
      title: text.competitionIndicator,
      invert: true,
      feminine: true,
      google: googleCompetition,
      social: socialCompetition,
      recommendation: competitionRec,
    },
  ].filter((card) => card.google || card.social);
  return { cards, levelLabel };
}

function competitorHost(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Platform hosts whose favicon carries no brand identity — fall back to the initial avatar.
const genericAvatarHosts = /(^|\.)(google\.[a-z.]+|instagram\.com|facebook\.com|tiktok\.com)$/i;

function CompetitorAvatar({ competitor }: { competitor: MarketingCompetitor }) {
  const [failed, setFailed] = useState(false);
  const style = competitorPlatformStyle(competitor);
  const host = competitorHost(competitor.url);
  const initial = (competitor.title || competitor.name || "?").trim().charAt(0).toUpperCase() || "?";
  if (!host || failed || genericAvatarHosts.test(host)) {
    return (
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm ${style.avatar}`}>
        {initial}
      </span>
    );
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <img
        src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
        alt=""
        loading="lazy"
        className="h-7 w-7"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export function MarketingPlanStages({ suiteId, stage }: { suiteId: string; stage?: StageSlug }) {
  const { lang, dir, t } = useLanguage();
  const isFunnelUser = useAuthStore((s) => s.user?.approval_status === "funnel");
  const baseText = labels[lang as keyof typeof labels] || labels.en;
  const text = useMemo(() => withAdminTextOverrides(baseText, t), [baseText, t]);
  const [suite, setSuite] = useState<Suite | null>(null);
  const [intelligence, setIntelligence] = useState<MarketingIntelligence | null>(null);
  const [visuals, setVisuals] = useState<PlanVisual[]>([]);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState("");
  const [showIntro, setShowIntro] = useState(false);
  const visualsRequested = useRef(false);
  const [autoStage, setAutoStage] = useState<StageSlug | null>(null);
  const [visualsSettled, setVisualsSettled] = useState(false);
  const autoStarted = useRef(false);

  const load = useCallback(async () => {
    setError("");
    const [suiteRes, planRes] = await Promise.all([api.suites.get(suiteId), api.marketingPlans.get(suiteId)]);
    setSuite(suiteRes);
    setIntelligence(planRes.intelligence || null);
    setVisuals(planRes.visuals || []);
  }, [suiteId]);

  const hasPlanContent = Boolean(
    intelligence && ((intelligence.keywords || []).length > 0 || (intelligence.competitors || []).length > 0)
  );

  useEffect(() => {
    // Generate the field images once — they serve both this page and the PDF.
    if (!hasPlanContent || visuals.length > 0 || visualsRequested.current) return;
    visualsRequested.current = true;
    api.marketingPlans.generateVisuals(suiteId)
      .then((res) => setVisuals(res.visuals || []))
      .catch(() => undefined)
      .finally(() => setVisualsSettled(true));
  }, [hasPlanContent, visuals.length, suiteId]);
  // Existing visuals count as settled — no extra request, no gate.
  const visualsReady = visualsSettled || visuals.length > 0;

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

  // A dead device connection must read as exactly that — not as our fault.
  function friendlyError(e: unknown): string {
    const msg = e instanceof Error ? e.message : "Request failed";
    return /load failed|failed to fetch|network\s?error|fetch failed/i.test(msg) ? text.networkError : msg;
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
      setError(friendlyError(e));
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
      setError(friendlyError(e));
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
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  async function resyncPlan() {
    // A long generation request can die on mobile (Safari "Load failed")
    // while the server still finishes and persists the section — re-pull
    // before declaring failure so completed work shows up.
    try {
      const fresh = await api.marketingPlans.get(suiteId);
      setIntelligence(fresh.intelligence || null);
      return fresh.intelligence || null;
    } catch {
      return null;
    }
  }

  async function run(action: BusyAction, fn: () => Promise<MarketingPlanResponse>) {
    setBusy(action);
    setError("");
    try {
      applyPlanResponse(await fn());
    } catch (e) {
      await resyncPlan();
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  async function generatePersonasInitial() {
    // Generate in small batches so the first personas show up within seconds,
    // while the stage keeps a "still generating" indicator for the rest.
    const TARGET = 10;
    const BATCH = 2;
    setBusy("personas");
    setError("");
    try {
      let existingValues: string[] = [];
      for (let generated = 0; generated < TARGET; generated += BATCH) {
        const res = generated === 0
          ? await api.marketingPlans.generatePersonas(suiteId, { language: lang, count: BATCH })
          : await api.marketingPlans.generateMorePersonas(suiteId, {
              language: lang,
              count: BATCH,
              existing_values: existingValues,
            });
        applyPlanResponse(res);
        const personas = res.intelligence?.personas || [];
        if (personas.length === 0) return;
        existingValues = personas.map((persona) => persona.name || persona.id).filter(Boolean) as string[];
        if (personas.length >= TARGET) return;
        setBusy("personas-more");
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  async function generateMorePersonas() {
    const existing = intelligence?.personas || [];
    await run("personas-more", () =>
      api.marketingPlans.generateMorePersonas(suiteId, {
        language: lang,
        count: 2,
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
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  const marketingMessage = suite?.strategy?.marketing_message || "";
  const [messageError, setMessageError] = useState("");

  async function generateMessage() {
    setBusy("message");
    setError("");
    setMessageError("");
    try {
      const res = await api.onboarding.generateStrategy({ suite_id: suiteId, user_language: lang });
      setSuite((prev) => (prev ? { ...prev, strategy: res.strategy } : prev));
    } catch (e) {
      if (e instanceof ApiError && e.detail === "funnel_regeneration_blocked") {
        setMessageError(text.funnelOneShot);
        return;
      }
      // The request may have died after the server saved the message — resync.
      try {
        const fresh = await api.suites.get(suiteId);
        setSuite(fresh);
        if (fresh.strategy?.marketing_message) return;
      } catch {
        /* fall through to the error below */
      }
      setMessageError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  // Manual edit of the message — not an AI regeneration, so it's open to everyone.
  async function saveMessage(next: string): Promise<boolean> {
    setMessageError("");
    try {
      const res = await api.marketingPlans.updateMessage(suiteId, { message: next });
      setSuite((prev) =>
        prev && prev.strategy
          ? { ...prev, strategy: { ...prev.strategy, marketing_message: res.marketing_message } }
          : prev,
      );
      return true;
    } catch (e) {
      setMessageError(friendlyError(e));
      return false;
    }
  }

  async function runStageSafe(slug: StageSlug, fn: () => Promise<MarketingPlanResponse>): Promise<boolean> {
    setAutoStage(slug);
    setBusy(slug);
    try {
      applyPlanResponse(await fn());
      return true;
    } catch {
      const fresh = await resyncPlan();
      // If the request died but the server persisted the section, it's a success.
      if (slug === "keywords") return (fresh?.keywords || []).length > 0;
      if (slug === "competitors") return (fresh?.competitors || []).length > 0;
      if (slug === "demand-supply") return Boolean(fresh?.demand_supply) || (fresh?.demand_signals || []).length > 0;
      return false;
    }
  }

  async function generateFullPlan() {
    setError("");
    const failed: string[] = [];
    try {
      // One failing section never blocks the rest of the chain.
      if (!(await runStageSafe("keywords", () => api.marketingPlans.generateKeywords(suiteId, { language: lang })))) failed.push(text.keywordsTitle);
      if (!(await runStageSafe("competitors", () => api.marketingPlans.generateCompetitors(suiteId, { language: lang })))) failed.push(text.competitorsTitle);
      if (!(await runStageSafe("demand-supply", () => api.marketingPlans.generateDemandSupply(suiteId, { language: lang })))) failed.push(text.demandTitle);
      setAutoStage("personas");
      setBusy(null);
      try {
        await generatePersonasInitial();
      } catch {
        await resyncPlan();
      }
      // The marketing message closes the plan: generated last, from everything above.
      if (!marketingMessage) {
        setAutoStage("message");
        await generateMessage();
      }
    } finally {
      setAutoStage(null);
      setBusy(null);
    }
    if (failed.length > 0) {
      setError(`${text.stageFailed}: ${failed.join(" · ")}`);
    }
  }

  const stageReady: Record<string, boolean> = {
    services: true,
    keywords: (intelligence?.keywords || []).length > 0,
    competitors: (intelligence?.competitors || []).length > 0,
    "demand-supply":
      Boolean(intelligence?.demand_supply) ||
      (intelligence?.demand_signals || []).length > 0 ||
      (intelligence?.supply_signals || []).length > 0,
    personas: (intelligence?.personas || []).length > 0,
    message: Boolean(marketingMessage),
  };
  const hasAnyPlanData = stageReady.keywords || stageReady.competitors || stageReady["demand-supply"] || stageReady.personas;

  // No plan yet → generation starts by itself, no button press needed.
  useEffect(() => {
    if (autoStarted.current || !suite || stage) return;
    if (!hasAnyPlanData && busy === null && autoStage === null) {
      autoStarted.current = true;
      const timer = window.setTimeout(() => void generateFullPlan(), 0);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suite, hasAnyPlanData]);
  // Progressive reveal while the full-plan run is in flight: a section only
  // appears once it is COMPLETE — never half-filled (a lone competitor while
  // more are coming reads as weak output). The in-flight stage shows as a
  // dedicated generating card instead.
  const revealing = autoStage !== null;
  const showStage = (slug: StageSlug) => !revealing || stageReady[slug];

  const visualByKind = (kind: string) => visuals.find((item) => item.kind === kind)?.url || "";

  // While the auto-run generates a section, its box sits under a translucent
  // veil with a loader naming exactly what is being generated right now.
  const stageTitleBySlug: Partial<Record<StageSlug, string>> = {
    keywords: text.keywordsTitle,
    competitors: text.competitorsTitle,
    "demand-supply": text.demandTitle,
    personas: text.personasTitle,
    message: text.messageTitle,
  };
  const generatingVeil = (slug: StageSlug) =>
    autoStage === slug && !stageReady[slug] ? (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-3xl bg-background/70 backdrop-blur-[2px]">
        <Loader2 size={30} className="animate-spin text-[color:var(--deck-accent,var(--brand-accent))]" />
        <p className="px-4 text-center text-sm font-bold text-foreground" dir="auto">
          {text.generatingNow} {stageTitleBySlug[slug]}
        </p>
      </div>
    ) : null;

  const allStages = (
    <div className="w-full min-w-0 overflow-x-hidden space-y-4" dir={dir}>
      {visualByKind("services") && <VisualDivider url={visualByKind("services")} />}
      <ServicesStage text={text} suiteId={suiteId} services={services} saving={busy === "save-services"} onSave={saveServices} />
      {showStage("keywords") && <div className="relative">{generatingVeil("keywords")}<KeywordsStage
        text={text}
        suiteId={suiteId}
        keywords={intelligence?.keywords || []}
        loading={busy === "keywords"}
        loadingMore={busy === "keywords-more"}
        saving={busy === "save-keywords"}
        onGenerate={() => run("keywords", () => api.marketingPlans.generateKeywords(suiteId, { language: lang }))}
        onMore={() => run("keywords-more", () => api.marketingPlans.generateMoreKeywords(suiteId, { language: lang, existing_values: (intelligence?.keywords || []).map((k) => k.text) }))}
        onSave={saveKeywords}
      /></div>}
      {showStage("competitors") && <div className="relative">{generatingVeil("competitors")}<CompetitorsStage
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
      /></div>}
      {showStage("demand-supply") && <div className="relative">{generatingVeil("demand-supply")}<DemandSupplyStage
        text={text}
        suiteId={suiteId}
        intelligence={intelligence}
        loading={busy === "demand-supply"}
        loadingMore={busy === "demand-supply-more"}
        onGenerate={() => run("demand-supply", () => api.marketingPlans.generateDemandSupply(suiteId, { language: lang }))}
        onMore={() => run("demand-supply-more", () => api.marketingPlans.generateMoreDemandSupply(suiteId, { language: lang }))}
      /></div>}
      {showStage("personas") && visualByKind("audience") && <VisualDivider url={visualByKind("audience")} />}
      {showStage("personas") && <div className="relative">{generatingVeil("personas")}<PersonasStage
        text={text}
        suiteId={suiteId}
        personas={intelligence?.personas || []}
        loading={busy === "personas"}
        loadingMore={busy === "personas-more"}
        onGenerate={generatePersonasInitial}
        onMore={generateMorePersonas}
      /></div>}
      {showStage("message") && <div className="relative">{generatingVeil("message")}<MarketingMessageStage
        text={text}
        message={marketingMessage}
        loading={busy === "message"}
        onGenerate={generateMessage}
        onSave={saveMessage}
        error={messageError}
        // One-shot journey: once the message exists, funnel visitors don't regenerate.
        canRegenerate={!isFunnelUser}
      /></div>}
      {revealing && autoStage && !stageReady[autoStage] && (
        <section className="flex items-center justify-center gap-3 rounded-3xl border border-dashed border-[color:var(--brand-accent)]/40 bg-card/60 p-8">
          <Loader2 size={24} className="animate-spin text-[color:var(--deck-accent,var(--brand-accent))]" />
          <p className="text-sm font-bold text-foreground" dir="auto">
            {text.generatingNow} {stageTitleBySlug[autoStage]}
          </p>
        </section>
      )}
      {(!revealing || stageReady.personas) && <MarketingPdfStage
        text={text}
        suiteId={suiteId}
        ready={(intelligence?.personas || []).length > 0}
        loading={busy === "pdf"}
        onDownload={downloadPdf}
      />}
    </div>
  );

  const emptyPlanState = (
    <section className="rounded-3xl border border-border bg-card p-8 text-center sm:p-12" dir={dir}>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--brand-accent)]/12 text-[color:var(--deck-accent,var(--brand-accent))]">
        <Target size={26} />
      </span>
      <h2 className="mt-5 text-2xl font-black text-foreground">{text.planEmptyTitle}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{text.planEmptyDesc}</p>
      <Button onClick={generateFullPlan} className="mt-6 gap-2">
        <Target size={16} />
        {text.generateFullPlan}
      </Button>
    </section>
  );

  // Shown from arrival until the images and the first section are ready —
  // no half-empty skeleton screen while the auto-run warms up.
  const initialLoadingState = (
    <section className="rounded-3xl border border-border bg-card p-10 text-center sm:p-14" dir={dir}>
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--brand-accent)]/12">
        <Loader2 size={30} className="animate-spin text-[color:var(--deck-accent,var(--brand-accent))]" />
      </span>
      <h2 className="mt-6 text-2xl font-black text-foreground">{text.preparingPlan}</h2>
      {autoStage && stageTitleBySlug[autoStage] && (
        <p className="mt-3 text-sm font-bold text-[color:var(--deck-accent,var(--brand-accent))]" dir="auto">
          {text.generatingNow} {stageTitleBySlug[autoStage]}
        </p>
      )}
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{text.preparingPlanHint}</p>
    </section>
  );

  // Reveal gate: during the initial auto-run keep the loader up until the
  // first section AND its field images are in; existing plans show instantly.
  const initialGenerating = revealing && (!stageReady.keywords || !visualsReady);

  if (!suite && !error) {
    return <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin" /></div>;
  }

  const coverImage = visuals.find((item) => item.kind === "cover")?.url || visuals[0]?.url || "";
  const brandName = String((brand as Record<string, unknown>).name || "") || text.title;
  const marketIndicators = buildMarketIndicators(intelligence, text);

  return (
    <div className="dark w-full min-w-0 space-y-4 overflow-x-hidden rounded-[2rem] bg-[#131318] p-3 text-foreground sm:p-5" dir={dir} style={{ "--deck-accent": "color-mix(in oklab, var(--brand-accent) 55%, white)" } as React.CSSProperties}>
      <section className="relative min-h-[220px] w-full min-w-0 overflow-hidden rounded-3xl border border-border bg-[#17171d] sm:min-h-[280px]">
        {coverImage ? (
          <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,color-mix(in_oklab,var(--brand-accent)_38%,transparent),transparent_38%),radial-gradient(circle_at_80%_60%,rgba(236,72,153,.2),transparent_35%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#131318] via-[#131318]/45 to-transparent" />
        <div className="relative flex min-h-[220px] flex-col justify-end gap-3 p-5 sm:min-h-[280px] sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-bold text-[color:var(--deck-accent)]">{text.coverKicker}</p>
            <button
              type="button"
              aria-label={showIntro ? text.hideIntro : text.showIntro}
              title={showIntro ? text.hideIntro : text.showIntro}
              aria-expanded={showIntro}
              onClick={() => setShowIntro((value) => !value)}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm shadow-sm transition ${showIntro ? "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]" : "border-white/20 bg-black/30 text-white/80 hover:text-white"}`}
            >
              <Info size={16} />
            </button>
          </div>
          <h1 className="os-text-wrap text-3xl font-black leading-tight text-white sm:text-5xl" dir="auto">{brandName}</h1>
          {marketIndicators.cards.length > 0 && (
            <div className="grid max-w-2xl gap-2 sm:grid-cols-2">
              {marketIndicators.cards.map((card) => (
                <div key={card.key} className="rounded-2xl border border-white/15 bg-black/45 p-3 backdrop-blur">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-white/60">{card.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${marketLevelTone(card.google, card.invert)}`}>
                      {text.byGoogle}: {marketIndicators.levelLabel(card.google, card.feminine)}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${marketLevelTone(card.social, card.invert)}`}>
                      {text.bySocial}: {marketIndicators.levelLabel(card.social, card.feminine)}
                    </span>
                  </div>
                  {card.recommendation && (
                    <p className="os-text-wrap mt-2 text-xs font-semibold leading-5 text-[color:var(--deck-accent)]">✨ {card.recommendation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {showIntro && (
            <p className="os-text-wrap rounded-xl border border-white/15 bg-black/50 p-3 text-sm leading-6 text-white/85 backdrop-blur">
              {text.desc}
            </p>
          )}
        </div>
      </section>
      {error && <div className="os-text-wrap rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">{error}</div>}
      {stage === "services" && <ServicesStage text={text} suiteId={suiteId} services={services} saving={busy === "save-services"} onSave={saveServices} detail />}
      {stage === "keywords" && (
        <KeywordsStage text={text} suiteId={suiteId} keywords={intelligence?.keywords || []} loading={busy === "keywords"} loadingMore={busy === "keywords-more"} saving={busy === "save-keywords"} onGenerate={() => run("keywords", () => api.marketingPlans.generateKeywords(suiteId, { language: lang }))} onMore={() => run("keywords-more", () => api.marketingPlans.generateMoreKeywords(suiteId, { language: lang, existing_values: (intelligence?.keywords || []).map((k) => k.text) }))} onSave={saveKeywords} detail />
      )}
      {stage === "competitors" && (
        <CompetitorsStage text={text} suiteId={suiteId} competitors={intelligence?.competitors || []} warnings={intelligence?.source_warnings || intelligence?.warnings || []} loading={busy === "competitors"} loadingMore={busy === "competitors-more"} saving={busy === "save-competitors"} onGenerate={() => run("competitors", () => api.marketingPlans.generateCompetitors(suiteId, { language: lang }))} onMore={() => run("competitors-more", () => api.marketingPlans.generateMoreCompetitors(suiteId, { language: lang }))} onTagsChange={(competitorId, tags) => run("competitors", () => api.marketingPlans.updateCompetitor(suiteId, competitorId, { classification_tags: tags }))} onSave={saveCompetitors} detail />
      )}
      {stage === "demand-supply" && <DemandSupplyStage text={text} suiteId={suiteId} intelligence={intelligence} loading={busy === "demand-supply"} loadingMore={busy === "demand-supply-more"} onGenerate={() => run("demand-supply", () => api.marketingPlans.generateDemandSupply(suiteId, { language: lang }))} onMore={() => run("demand-supply-more", () => api.marketingPlans.generateMoreDemandSupply(suiteId, { language: lang }))} detail />}
      {stage === "personas" && <PersonasStage text={text} suiteId={suiteId} personas={intelligence?.personas || []} loading={busy === "personas"} loadingMore={busy === "personas-more"} onGenerate={generatePersonasInitial} onMore={generateMorePersonas} detail />}
      {stage === "pdf" && <MarketingPdfStage text={text} suiteId={suiteId} ready={(intelligence?.personas || []).length > 0} loading={busy === "pdf"} onDownload={downloadPdf} detail />}
      {!stage && (
        initialGenerating || (!hasAnyPlanData && !revealing && !error)
          ? initialLoadingState
          : !hasAnyPlanData && !revealing
            ? emptyPlanState
            : allStages
      )}
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

function VisualDivider({ url, title }: { url: string; title?: string }) {
  return (
    <div className="relative h-28 w-full min-w-0 overflow-hidden rounded-3xl border border-border sm:h-40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#131318]/80 via-transparent to-[#131318]/30" />
      {title && <p className="absolute bottom-4 start-6 text-2xl font-black text-white" dir="auto">{title}</p>}
    </div>
  );
}

function StageBox({ title, description, icon, suiteId, slug, children, detail, expand }: { title: string; description: string; icon: ReactNode; suiteId: string; slug: StageSlug; children: ReactNode; detail?: boolean; expand?: { show: string; hide: string } }) {
  const tone = stageTones[slug];
  const [showDescription, setShowDescription] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const collapsible = Boolean(expand) && !detail;
  return (
    <section className={`relative w-full min-w-0 max-w-full overflow-hidden rounded-3xl border bg-card p-4 shadow-sm sm:p-6 ${tone.section}`}>
      <span className={`absolute inset-y-0 start-0 w-1.5 ${tone.accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>{icon}</span>
          <div className="min-w-0">
            <h2 className="os-text-wrap text-2xl font-black text-foreground">{title}</h2>
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
      <div className={`relative mt-5 min-w-0 ${collapsible && !expanded ? "max-h-[330px] overflow-hidden" : ""}`}>
        {children}
        {collapsible && !expanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            style={{ background: "linear-gradient(to top, var(--card), transparent)" }}
          />
        )}
      </div>
      {collapsible && (
        <div className="relative mt-3 flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((value) => !value)} className="gap-1.5">
            {expanded ? expand!.hide : expand!.show}
            <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
      )}
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
    <StageBox title={text.keywordsTitle} description={text.keywordsDesc} icon={<FileSearch size={18} />} suiteId={suiteId} slug="keywords" detail={detail} expand={{ show: text.showAll, hide: text.collapseAll }}>
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
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [addingSource, setAddingSource] = useState<string | null>(null);
  const [manual, setManual] = useState({ name: "", url: "", snippet: "" });
  const isBusy = loading || loadingMore || saving;
  const grouped = useMemo(() => {
    const groups = new Map<string, MarketingCompetitor[]>();
    for (const competitor of competitors) {
      if ((competitor.classification_tags || []).includes("not_competitor")) continue;
      const normalized = competitorGroupKey(competitor);
      groups.set(normalized, [...(groups.get(normalized) || []), competitor]);
    }
    for (const [source, items] of groups.entries()) {
      groups.set(
        source,
        [...items].sort((a, b) => {
          const scoreDiff = competitorScore(b) - competitorScore(a);
          if (scoreDiff !== 0) return scoreDiff;
          return competitors.indexOf(a) - competitors.indexOf(b);
        })
      );
    }
    const primarySources = competitorSourceOrder.slice(0, 5).map((source) => [source, groups.get(source) || []] as [string, MarketingCompetitor[]]);
    const extraSources = [...groups.entries()].filter(([source]) => !competitorSourceOrder.slice(0, 5).includes(source));
    return [...primarySources, ...extraSources].sort(([a], [b]) => {
      const indexA = competitorSourceOrder.indexOf(a);
      const indexB = competitorSourceOrder.indexOf(b);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }, [competitors]);
  // Tabs: the five primary sources always, extra sources (e.g. "other",
  // sponsored) only when they actually hold competitors.
  const tabSources = grouped.filter(
    ([source, items]) => competitorSourceOrder.slice(0, 5).includes(source) || items.length > 0
  );
  const resolvedSource =
    activeSource && tabSources.some(([source]) => source === activeSource)
      ? activeSource
      : tabSources.find(([, items]) => items.length > 0)?.[0] || tabSources[0]?.[0] || null;
  const activeItems = grouped.find(([source]) => source === resolvedSource)?.[1] || [];
  const visibleCompetitorCount = grouped.reduce((total, [, items]) => total + items.length, 0);

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
    <StageBox title={text.competitorsTitle} description={text.competitorsDesc} icon={<Search size={18} />} suiteId={suiteId} slug="competitors" detail={detail} expand={{ show: text.showAll, hide: text.collapseAll }}>
      <div className="flex min-w-0 flex-wrap gap-2">
        <Button onClick={onGenerate} disabled={isBusy} className="gap-2">{loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}{text.generate}</Button>
        {competitors.length > 0 && <Button variant="outline" onClick={onMore} disabled={isBusy} className="gap-2">{loadingMore ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{text.generateMore}</Button>}
      </div>
      {warnings.length > 0 && !loading && !loadingMore && (
        <div className="mt-4 space-y-2">
          {warnings.slice(0, 4).map((warning, index) => (
            <p key={`${warning}-${index}`} className="os-text-wrap rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" dir="auto">{warning}</p>
          ))}
        </div>
      )}
      <div className="mt-4 space-y-4">
        {visibleCompetitorCount === 0 && !resolvedSource ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{text.noCompetitors}</p>
        ) : (
          <>
            {/* Source tabs — one horizontal, scrollable bar */}
            <div className="os-scroll-x -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {tabSources.map(([source, items]) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => setActiveSource(source)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                    resolvedSource === source
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-zinc-500 hover:text-foreground"
                  }`}
                >
                  <SourceGlyph source={source} />
                  {competitorSourceLabels[source] || source}
                  {items.length > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                      resolvedSource === source ? "bg-background/25 text-background" : "bg-muted text-muted-foreground"
                    }`}>{items.length}</span>
                  )}
                </button>
              ))}
            </div>

            {resolvedSource && (
              <section key={resolvedSource} className="min-w-0">
                <div className="mb-2 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setAddingSource((current) => current === resolvedSource ? null : resolvedSource)} disabled={isBusy} className="h-8 gap-1 px-2 text-xs">
                    <Plus size={13} />
                    {text.addCompetitor}
                  </Button>
                </div>
                {addingSource === resolvedSource && (
                  <div className="mb-3 grid gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/10 sm:grid-cols-[1fr_1fr_auto]">
                    <Input value={manual.name} onChange={(e) => setManual((value) => ({ ...value, name: e.target.value }))} placeholder={text.newCompetitorName} dir="auto" />
                    <Input value={manual.url} onChange={(e) => setManual((value) => ({ ...value, url: e.target.value }))} placeholder={text.newCompetitorUrl} dir="ltr" />
                    <div className="flex gap-2 sm:row-span-2 sm:flex-col">
                      <Button type="button" onClick={() => addManualCompetitor(resolvedSource)} disabled={isBusy || !manual.name.trim()} className="h-10 gap-2">
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                        {text.addCompetitor}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setAddingSource(null)} className="h-10">{text.cancel}</Button>
                    </div>
                    <Input value={manual.snippet} onChange={(e) => setManual((value) => ({ ...value, snippet: e.target.value }))} placeholder={text.newCompetitorDescription} dir="auto" className="sm:col-span-2" />
                  </div>
                )}
                <div className="os-scroll-x flex snap-x gap-3 pb-2">
                  {activeItems.length === 0 ? (
                    <p className="w-[76%] max-w-80 shrink-0 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground sm:w-80">{text.noSourceCompetitors}</p>
                  ) : activeItems.map((competitor, index) => (
                    <div key={competitor.id} className="w-[76%] max-w-80 shrink-0 snap-start sm:w-80">
                      <CompetitorCard
                        text={text}
                        competitor={competitor}
                        onTagsChange={onTagsChange}
                        onMoveUp={() => moveCompetitor(competitor, -1)}
                        onMoveDown={() => moveCompetitor(competitor, 1)}
                        moveUpDisabled={isBusy || index === 0}
                        moveDownDisabled={isBusy || index === activeItems.length - 1}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
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
    let next: string[];
    if (tag === "not_competitor") {
      next = tags.includes(tag) ? [] : ["not_competitor"];
    } else {
      const withoutNotCompetitor = tags.filter((item) => item !== "not_competitor");
      next = withoutNotCompetitor.includes(tag)
        ? withoutNotCompetitor.filter((item) => item !== tag)
        : [...withoutNotCompetitor, tag];
    }
    onTagsChange(competitor.id, next);
  }
  const style = competitorPlatformStyle(competitor);
  const host = competitorHost(competitor.url);
  const sourceLabel = competitorSourceLabels[competitorGroupKey(competitor)] || competitor.result_type || competitor.platform;
  const snippet = competitor.snippet || competitor.reason || competitor.evidence;
  const relevance = competitor.research_lead ? "" : `${competitor.relevance || ""}`.toLowerCase();
  return (
    <article className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-background shadow-sm transition-shadow hover:shadow-md ${competitor.research_lead ? "border-dashed border-amber-300 dark:border-amber-500/40" : "border-border"}`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${style.bar}`} aria-hidden />
      <div className="flex items-start gap-3 p-4 pb-0 pt-5">
        <CompetitorAvatar competitor={competitor} />
        <div className="min-w-0 flex-1">
          <h3 className="os-text-wrap font-bold leading-snug text-foreground" dir="auto">{competitor.title || competitor.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}>
              <SourceIcon competitor={competitor} />
              <span className="min-w-0 truncate">{sourceLabel}</span>
            </span>
            {competitor.research_lead && (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-400/70 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                <FileSearch size={11} />
                {text.leadBadge}
              </span>
            )}
            {relevance === "nearby" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <MapPinned size={11} />
                {text.nearbyBadge}
              </span>
            )}
            {relevance === "real" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                <Check size={11} />
                {text.confirmedBadge}
              </span>
            )}
          </div>
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
      {(competitor.rating || competitor.address) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-2.5 text-xs text-muted-foreground">
          {competitor.rating ? (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              {competitor.rating}
              {competitor.reviews ? <span className="font-normal text-muted-foreground">({competitor.reviews} {text.reviewsWord})</span> : null}
            </span>
          ) : null}
          {competitor.address ? (
            <span className="inline-flex min-w-0 items-center gap-1" dir="auto">
              <MapPinned size={12} className="shrink-0" />
              <span className="min-w-0 truncate">{competitor.address}</span>
            </span>
          ) : null}
        </div>
      )}
      {snippet && <p className="os-text-wrap px-4 pt-2.5 text-sm leading-6 text-muted-foreground" dir="auto">{snippet}</p>}
      <div className="px-4 py-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{text.tagsLabel}</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(tagText).map(([tag, label]) => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`os-text-wrap rounded-full border px-2.5 py-1 text-xs font-semibold ${tags.includes(tag) ? "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]" : "border-border text-muted-foreground hover:text-foreground"}`}>{label}</button>
          ))}
        </div>
      </div>
      <footer className="mt-auto flex items-center gap-1.5 border-t border-border/60 bg-muted/30 px-3 py-2">
        {competitor.url ? (
          <a href={competitor.url} target="_blank" rel="noreferrer" title={competitor.url} className="inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90">
            <ArrowUpRight size={13} className="shrink-0" />
            <span className="min-w-0 truncate" dir="ltr">{host || text.open}</span>
          </a>
        ) : (
          <span className="inline-flex h-8 min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground" dir="ltr">{shortUrl(competitor.url)}</span>
        )}
        <button type="button" aria-label={text.copy} title={copied ? text.copied : text.copy} onClick={copyUrl} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
        <button type="button" aria-label={text.preview} title={text.preview} onClick={() => setPreview(true)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
          <Eye size={13} />
        </button>
      </footer>
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

function DemandSupplyStage({ text, suiteId, intelligence, loading, loadingMore, onGenerate, onMore, detail }: { text: typeof labels.en; suiteId: string; intelligence: MarketingIntelligence | null; loading: boolean; loadingMore?: boolean; onGenerate: () => void; onMore?: () => void; detail?: boolean }) {
  const demand = intelligence?.demand_signals || [];
  const supply = intelligence?.supply_signals || [];
  const opportunities = intelligence?.opportunities || [];
  const planner = intelligence?.demand_supply;
  const summary = planner?.summary;
  const keywordMetrics = planner?.keyword_metrics || [];
  const hasData = Boolean(summary?.analyzed_keywords || keywordMetrics.length || planner?.warning || demand.length || supply.length || opportunities.length);
  return (
    <StageBox title={text.demandTitle} description={text.demandDesc} icon={<Target size={18} />} suiteId={suiteId} slug="demand-supply" detail={detail} expand={{ show: text.showAll, hide: text.collapseAll }}>
      <div className="flex min-w-0 flex-wrap gap-2">
        <Button onClick={onGenerate} disabled={loading || loadingMore} className="gap-2">{loading ? <Loader2 size={15} className="animate-spin" /> : <Target size={15} />}{text.generate}</Button>
        {hasData && onMore && (planner?.remaining_terms ?? 0) > 0 && (
          <Button variant="outline" onClick={onMore} disabled={loading || loadingMore} className="gap-2">
            {loadingMore ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {text.generateMore} ({planner?.remaining_terms})
          </Button>
        )}
      </div>
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
    <StageBox title={text.personasTitle} description={text.personasDesc} icon={<UserRound size={18} />} suiteId={suiteId} slug="personas" detail={detail} expand={{ show: text.showAll, hide: text.collapseAll }}>
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
        loading ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> {text.personasGenerating}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{text.noPersonas}</p>
        )
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

function MarketingMessageStage({
  text,
  message,
  loading,
  onGenerate,
  onSave,
  error,
  canRegenerate,
}: {
  text: typeof labels.en;
  message: string;
  loading: boolean;
  onGenerate: () => void;
  onSave: (next: string) => Promise<boolean>;
  error?: string;
  canRegenerate?: boolean;
}) {
  const tone = stageTones.message;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message);
  const [saving, setSaving] = useState(false);
  const showButton = !message || canRegenerate;

  function startEditing() {
    setDraft(message);
    setEditing(true);
  }

  async function commit() {
    setSaving(true);
    const ok = await onSave(draft.trim());
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <section className={`rounded-3xl border p-6 sm:p-8 scroll-mt-24 ${tone.section}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}>
            <MessageCircle size={20} />
          </span>
          <div>
            <h2 className="text-xl font-black text-foreground">{text.messageTitle}</h2>
            <p className="text-sm text-muted-foreground">{text.messageDesc}</p>
          </div>
        </div>
        {!editing && (
          <div className="flex flex-wrap items-center gap-2">
            {message && (
              <Button onClick={startEditing} disabled={loading} variant="outline" className="gap-2">
                <Pencil size={15} />
                {text.editMessage}
              </Button>
            )}
            {showButton && (
              <Button onClick={onGenerate} disabled={loading} variant={message ? "outline" : "default"} className="gap-2">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {message ? text.regenerateMessage : text.generateMessage}
              </Button>
            )}
          </div>
        )}
      </div>
      {loading && !message && (
        <p className="mt-4 text-sm text-muted-foreground">{text.messageGenerating}</p>
      )}
      {error && (
        <p className="os-text-wrap mt-4 rounded-xl border border-red-300/60 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" dir="auto">
          {error}
        </p>
      )}
      {editing ? (
        <div className="mt-5 space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            maxLength={4000}
            placeholder={text.messagePlaceholder}
            className="w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-base leading-8 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            dir="auto"
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={commit} disabled={saving || !draft.trim()} className="gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? text.messageSaving : text.saveMessage}
            </Button>
            <Button onClick={() => setEditing(false)} disabled={saving} variant="outline" className="gap-2">
              <X size={15} />
              {text.cancelEditMessage}
            </Button>
          </div>
        </div>
      ) : (
        message && (
          <div className="mt-5 rounded-2xl border border-[color:var(--brand-accent)]/30 bg-[color:var(--brand-accent)]/10 p-5">
            <p className="os-text-wrap text-base font-semibold leading-8 text-foreground" dir="auto">{message}</p>
          </div>
        )
      )}
    </section>
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
    <section className={`rounded-3xl border border-border bg-card p-6 sm:p-8 ${detail ? "" : "scroll-mt-24"}`}>
      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Button onClick={onDownload} disabled={!ready || loading} className="h-12 flex-1 gap-2 rounded-2xl text-base font-bold sm:max-w-sm">
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
          {text.downloadPlanPdf}
        </Button>
        <Link
          href={`/suite/${suiteId}/work-plans`}
          className="inline-flex h-16 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[var(--brand-accent)] to-[var(--brand-accent-strong)] px-6 text-lg font-black text-white shadow-lg shadow-[#2f80ff]/30 ring-2 ring-[color:var(--brand-accent)]/40 ring-offset-2 ring-offset-transparent transition-transform hover:scale-[1.02] active:scale-[0.98] sm:max-w-sm"
        >
          <ArrowUpRight size={20} />
          {text.goToWorkPlan}
        </Link>
      </div>
      {!ready && (
        <p className="os-text-wrap mt-3 text-center text-sm text-muted-foreground" dir="auto">
          {text.pdfNeedsPersonas}
        </p>
      )}
    </section>
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
