"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Brand, BrandLogo, BrandPersona, MarketingStrategy, ResearchDebug } from "@/lib/api";
import { useT, useLanguage } from "@/lib/i18n/LanguageContext";
import { LANGUAGES, LangCode } from "@/lib/i18n/translations";
import { getSuggestions, findNicheIndex, getEnglishNiche } from "@/lib/i18n/suggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Plus, X, CheckCircle2, ChevronRight, ChevronLeft,
  AtSign, AlertCircle, Building2, Info, MapPin,
} from "lucide-react";

type Step = "name" | "links" | "extracting"
  | "step-a" | "step-b" | "step-c" | "step-d" | "step-e" | "step-f" | "step-g" | "step-h"
  | "strategy" | "preview" | "done";

// ── Platform helpers ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "website",   label: "Website",   placeholder: "https://your-website.com",          hint: "Main website" },
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourpage",     hint: "Instagram profile" },
  { id: "facebook",  label: "Facebook",  placeholder: "https://facebook.com/yourpage",      hint: "Facebook page" },
  { id: "tiktok",    label: "TikTok",    placeholder: "https://tiktok.com/@yourhandle",     hint: "TikTok profile" },
  { id: "linkedin",  label: "LinkedIn",  placeholder: "https://linkedin.com/company/yours", hint: "LinkedIn company" },
  { id: "other",     label: "Other",     placeholder: "Any other relevant link",            hint: "Other link" },
];

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

function isRtlLanguage(lang: string, dir?: string) {
  return dir === "rtl" || RTL_LANGS.has(lang);
}

function platformPlaceholder(platform: string, lang: string) {
  const rtl = RTL_LANGS.has(lang);
  const he = lang === "he";
  const labels: Record<string, { ar: string; he: string; en: string }> = {
    website: {
      ar: "رابط الموقع الرئيسي",
      he: "קישור לאתר הראשי",
      en: "https://your-website.com",
    },
    instagram: {
      ar: "رابط صفحة إنستغرام",
      he: "קישור לעמוד אינסטגרם",
      en: "https://instagram.com/yourpage",
    },
    facebook: {
      ar: "رابط صفحة فيسبوك",
      he: "קישור לעמוד פייסבוק",
      en: "https://facebook.com/yourpage",
    },
    tiktok: {
      ar: "رابط صفحة تيك توك",
      he: "קישור לעמוד טיקטוק",
      en: "https://tiktok.com/@yourhandle",
    },
    linkedin: {
      ar: "رابط صفحة لينكدإن",
      he: "קישור לעמוד לינקדאין",
      en: "https://linkedin.com/company/yours",
    },
    other: {
      ar: "أي رابط مهم آخر",
      he: "כל קישור חשוב נוסף",
      en: "Any other relevant link",
    },
  };
  if (he) return labels[platform]?.he || labels.other.he;
  if (rtl) return labels[platform]?.ar || labels.other.ar;
  return labels[platform]?.en || labels.other.en;
}

function createWithoutSuiteCopy(lang: string) {
  if (lang === "he") {
    return {
      title: "יצירה בלי Suite",
      desc: "אפשר להתחיל ליצור פוסט, תמונה או וידאו גם לפני שמקימים פרופיל עסק מלא.",
      cta: "התחל יצירה מהירה",
    };
  }
  if (lang === "ar") {
    return {
      title: "إنشاء بدون سوت",
      desc: "ابدأ توليد بوست، صورة أو فيديو حتى قبل تجهيز بروفايل كامل للمصلحة.",
      cta: "ابدأ إنشاء سريع",
    };
  }
  return {
    title: "Create without a Suite",
    desc: "Start generating a post, image, or video before building a full business profile.",
    cta: "Start quick create",
  };
}


const LANG_TO_DIALECT: Record<string, string> = {
  "ar": "Palestinian Arabic", "he": "Hebrew", "en": "English",
  "ru": "Russian", "fr": "French", "es": "Spanish", "tr": "Turkish", "zh": "Chinese",
};

// Arabs in Israel get exactly this dialect suggestion — no long AI-extracted
// descriptions in the field.
const ARAB_48_DIALECT = "عربي - عرب الـ48";

function suggestedDialect(extracted: string, langs: string[], countriesText: string) {
  const arabicAudience = (langs[0] || "") === "ar" || /arab|عرب|فلسطين|palestin/i.test(extracted);
  const inIsrael = /israel|إسرائيل|ישראל/i.test(countriesText);
  return arabicAudience && inIsrael ? ARAB_48_DIALECT : extracted;
}

const META_INTERESTS: Record<string, string[]> = {
  marketing: ["Meta Ads", "Instagram Business", "Small business", "Entrepreneurship", "Digital marketing"],
  restaurant: ["Restaurants", "Food delivery", "Local food", "Dining out", "Coffee shops"],
  fashion: ["Fashion accessories", "Beauty salons", "Shopping", "Style", "Cosmetics"],
  realestate: ["Real estate", "Home buyers", "Interior design", "Mortgage loans", "Home improvement"],
  pets: ["Pet owners", "Dog owners", "Cat owners", "Veterinary care", "Pet food"],
  default: ["Small business", "Online shopping", "Local services", "Social media", "Technology"],
};

function localizedAudienceBehaviors(lang: string, key: string): string[] {
  const sets: Record<string, Record<string, string[]>> = {
    ar: {
      marketing: ["يبحثون عن عملاء محتملين", "يتابعون محتوى تسويق رقمي", "يقارنون أداء الحملات", "يحتاجون أتمتة للمحتوى"],
      restaurant: ["يطلبون عبر الإنترنت", "يتأثرون بصور الطعام", "يبحثون عن مطاعم قريبة", "يتابعون العروض اليومية"],
      fashion: ["يتسوقون عبر إنستغرام", "يتابعون الترندات", "يقارنون الأسعار", "يفضلون صور منتجات واضحة"],
      realestate: ["يبحثون عن عقارات", "يقارنون مواقع وأسعار", "يهتمون بالتمويل", "يتابعون مشاريع جديدة"],
      pets: ["يشترون مستلزمات حيوانات", "يتابعون نصائح العناية", "يبحثون عن خدمات قريبة", "يتفاعلون مع محتوى صور الحيوانات"],
      default: ["يبحثون عن حلول محلية", "يتفاعلون مع محتوى السوشيال", "يقارنون الأسعار", "يفضلون خدمة شخصية"],
    },
    he: {
      marketing: ["מחפשים לידים חדשים", "עוקבים אחרי תוכן שיווק דיגיטלי", "משווים ביצועי קמפיינים", "צריכים אוטומציה לתוכן"],
      restaurant: ["מזמינים אונליין", "מושפעים מתמונות אוכל", "מחפשים מסעדות קרובות", "עוקבים אחרי מבצעים יומיים"],
      fashion: ["קונים דרך אינסטגרם", "עוקבים אחרי טרנדים", "משווים מחירים", "מעדיפים תמונות מוצר ברורות"],
      realestate: ["מחפשים נכסים", "משווים אזורים ומחירים", "מתעניינים במימון", "עוקבים אחרי פרויקטים חדשים"],
      pets: ["קונים מוצרים לחיות", "עוקבים אחרי טיפים לטיפול", "מחפשים שירותים קרובים", "מגיבים לתוכן עם תמונות חיות"],
      default: ["מחפשים פתרונות מקומיים", "מגיבים לתוכן ברשתות", "משווים מחירים", "מעדיפים שירות אישי"],
    },
    en: {
      marketing: ["Look for new leads", "Follow digital marketing content", "Compare campaign performance", "Need content automation"],
      restaurant: ["Order online", "React to food visuals", "Search for nearby restaurants", "Follow daily offers"],
      fashion: ["Shop through Instagram", "Follow trends", "Compare prices", "Prefer clear product photos"],
      realestate: ["Search for properties", "Compare locations and prices", "Care about financing", "Follow new projects"],
      pets: ["Buy pet supplies", "Follow care tips", "Search for nearby services", "Engage with pet photo content"],
      default: ["Look for local solutions", "Engage with social content", "Compare prices", "Prefer personal service"],
    },
  };
  return (sets[lang]?.[key] || sets.en[key] || sets.en.default).slice(0, 5);
}

function localizedAudienceStatuses(lang: string, key: string): string[] {
  const sets: Record<string, Record<string, string[]>> = {
    ar: {
      marketing: ["أصحاب مصالح تجارية", "مدراء تسويق", "مستقلون", "شركات صغيرة"],
      restaurant: ["عائلات", "موظفون قريبون", "طلاب", "محبو التجارب المحلية"],
      fashion: ["نساء مهتمات بالأناقة", "عرائس ومخطوبات", "شابات", "متسوقون أونلاين"],
      realestate: ["أزواج شباب", "مستثمرون", "عائلات تبحث عن بيت", "أصحاب مصالح"],
      pets: ["أصحاب حيوانات", "عائلات مع أطفال", "مربو كلاب", "مربو قطط"],
      default: ["أصحاب مصالح تجارية", "أهالي لأولاد", "طلاب", "جمهور بريميوم"],
    },
    he: {
      marketing: ["בעלי עסקים", "מנהלי שיווק", "עצמאים", "עסקים קטנים"],
      restaurant: ["משפחות", "עובדים באזור", "סטודנטים", "אוהבי חוויות מקומיות"],
      fashion: ["נשים שמתעניינות בסטייל", "כלות ומאורסות", "צעירות", "קונים אונליין"],
      realestate: ["זוגות צעירים", "משקיעים", "משפחות שמחפשות בית", "בעלי עסקים"],
      pets: ["בעלי חיות", "משפחות עם ילדים", "בעלי כלבים", "בעלי חתולים"],
      default: ["בעלי עסקים", "הורים לילדים", "סטודנטים", "קהל פרימיום"],
    },
    en: {
      marketing: ["Business owners", "Marketing managers", "Freelancers", "Small companies"],
      restaurant: ["Families", "Nearby employees", "Students", "Local experience seekers"],
      fashion: ["Style-conscious women", "Brides and engaged couples", "Young adults", "Online shoppers"],
      realestate: ["Young couples", "Investors", "Families looking for a home", "Business owners"],
      pets: ["Pet owners", "Families with children", "Dog owners", "Cat owners"],
      default: ["Business owners", "Parents", "Students", "Premium buyers"],
    },
  };
  return (sets[lang]?.[key] || sets.en[key] || sets.en.default).slice(0, 5);
}

function classifyLogoShape(width?: number | null, height?: number | null): BrandLogo["shape"] {
  if (!width || !height) return "unknown";
  const ratio = width / height;
  if (ratio >= 0.85 && ratio <= 1.18) return "square";
  return ratio > 1.18 ? "horizontal" : "vertical";
}

function logoShapeLabel(shape?: BrandLogo["shape"]) {
  if (shape === "square") return "Square";
  if (shape === "horizontal") return "Horizontal";
  if (shape === "vertical") return "Vertical";
  if (shape === "vector") return "Vector";
  return "Unknown";
}

async function buildLocalLogoPreview(file: File): Promise<BrandLogo> {
  const url = URL.createObjectURL(file);
  const format = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : file.type.split("/").pop();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        name: file.name,
        url,
        format,
        width: img.naturalWidth || null,
        height: img.naturalHeight || null,
        shape: classifyLogoShape(img.naturalWidth, img.naturalHeight),
        background: "unknown",
      });
    };
    img.onerror = () => {
      resolve({
        name: file.name,
        url,
        format,
        width: null,
        height: null,
        shape: format === "svg" ? "vector" : "unknown",
        background: "unknown",
      });
    };
    img.src = url;
  });
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current, steps }: { current: Step; steps: { key: Step; label: string }[] }) {
  const idx = steps.findIndex((s) => s.key === current);
  const visible = steps
    .map((s, i) => ({ ...s, index: i }))
    .filter((s) => Math.abs(s.index - idx) <= 1 || s.index === 0 || s.index === steps.length - 1);
  return (
    <div className="mb-8 rounded-2xl border border-border bg-card/70 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 overflow-hidden">
        {visible.map((s, visibleIdx) => (
          <div key={s.key} className="flex min-w-0 flex-1 items-center gap-2">
            {visibleIdx > 0 && visible[visibleIdx - 1].index !== s.index - 1 && (
              <span className="text-muted-foreground">...</span>
            )}
            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors ${
              s.index < idx ? "bg-emerald-500 text-white" : s.index === idx ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}>
              {s.index < idx ? "✓" : s.index + 1}
            </div>
            <span className={`truncate text-xs ${s.index === idx ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#f8d84a] via-[#ff4fa3] to-[#2f80ff] transition-all"
          style={{ width: `${((idx + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function ResearchDebugPanel({ debug, lang }: { debug: ResearchDebug | null; lang: string }) {
  if (!debug) return null;
  const labels = lang === "ar"
    ? {
        title: "تقرير قراءة المصادر",
        sources: "المصادر",
        context: "نص التحليل",
        search: "البحث",
        ai: "نتيجة الذكاء",
        time: "وقت الذكاء",
        fallback: "تصحيح تلقائي",
        services: "خدمات",
        products: "منتجات",
        category: "فئة",
        text: "نص",
        posts: "بوستات",
        captions: "كابشنز",
        reason: "سبب",
      }
    : lang === "he"
      ? {
          title: "דוח קריאת מקורות",
          sources: "מקורות",
          context: "טקסט לניתוח",
          search: "חיפוש",
          ai: "תוצאת AI",
          time: "זמן AI",
          fallback: "תיקון אוטומטי",
          services: "שירותים",
          products: "מוצרים",
          category: "קטגוריה",
          text: "טקסט",
          posts: "פוסטים",
          captions: "כיתובים",
          reason: "סיבה",
        }
      : {
          title: "Source reading report",
          sources: "Sources",
          context: "Analysis text",
          search: "Search",
          ai: "AI result",
          time: "AI time",
          fallback: "Auto fallback",
          services: "Services",
          products: "Products",
          category: "Category",
          text: "Text",
          posts: "Posts",
          captions: "Captions",
          reason: "Reason",
        };
  const reports = debug.source_reports || [];
  const ai = debug.final_output || debug.ai_output || {};

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground" dir="auto">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Info size={14} /> {labels.title}
        </div>
        <div>
          {labels.sources}: {debug.sources_ok || 0}/{debug.sources_requested || reports.length}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div>{labels.context}: {(debug.context_chars || 0).toLocaleString()}</div>
        <div>{labels.search}: {(debug.search_snippets_chars || 0).toLocaleString()}</div>
        <div>
          {labels.ai}: {labels.category} {ai.industry || ai.niche ? "ok" : "-"} · {labels.services} {ai.services_count || 0} · {labels.products} {ai.products_count || 0}
        </div>
      </div>
      {debug.ai_elapsed_ms ? (
        <div className="mt-2">
          {labels.time}: {(debug.ai_elapsed_ms / 1000).toFixed(1)}s
        </div>
      ) : null}
      {(debug.fallbacks_applied || []).length > 0 && (
        <div className="mt-2 text-emerald-500">
          {labels.fallback}: {debug.fallbacks_applied?.join(", ")}
        </div>
      )}
      {debug.reason && <div className="mt-2 text-amber-500">{labels.reason}: {debug.reason}</div>}
      {reports.length > 0 && (
        <div className="mt-3 space-y-1">
          {reports.map((item, idx) => (
            <div key={`${item.url}-${idx}`} className="rounded-md border border-border/70 bg-background/60 px-2 py-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{item.kind} · {item.status}</span>
                <span className="truncate sm:max-w-[360px]">{item.title || item.url}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <span>{labels.text}: {item.text_chars || item.description_chars || 0}</span>
                <span>{labels.services}: {item.service_candidates || 0}</span>
                <span>{labels.posts}: {item.recent_posts || 0}</span>
                <span>{labels.captions}: {item.captions_chars || 0}</span>
              </div>
              {item.error && <div className="mt-1 text-red-400">{item.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewSuitePage() {
  const router = useRouter();
  const t = useT();
  const { lang, dir } = useLanguage();
  const isRtl = isRtlLanguage(lang, dir);
  const quickCreateCopy = createWithoutSuiteCopy(lang);
  const ForwardIcon = isRtl ? ChevronLeft : ChevronRight;
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;
  const suggestions = getSuggestions(lang);

  const LOCATION_SCOPES: { value: string; label: string }[] = [
    { value: "Custom", label: t("suite.new.scopeCustom") },
    { value: "Worldwide", label: t("suite.new.scopeWorldwide") },
    { value: "Middle East", label: t("suite.new.scopeMiddleEast") },
    { value: "Europe", label: t("suite.new.scopeEurope") },
    { value: "North America", label: t("suite.new.scopeNorthAmerica") },
    { value: "Asia", label: t("suite.new.scopeAsia") },
  ];

  const STEPS: { key: Step; label: string }[] = [
    { key: "name", label: t("suite.new.stepName") },
    { key: "links", label: t("suite.new.stepLinks") },
    { key: "extracting", label: t("suite.new.stepAnalyzing") },
    { key: "step-a", label: t("suite.new.stepBizName") },
    { key: "step-b", label: t("suite.new.stepCategory") },
    { key: "step-c", label: t("suite.new.stepLanguages") },
    { key: "step-d", label: t("suite.new.stepServices") },
    { key: "step-e", label: t("suite.new.stepAudience") },
    { key: "step-f", label: t("suite.new.stepWhyUs") },
    { key: "step-g", label: t("suite.new.stepBrand") },
    { key: "step-h", label: t("suite.new.stepPersonas") },
    { key: "strategy", label: t("suite.new.stepStrategy") },
    { key: "preview", label: t("suite.new.stepPreview") },
    { key: "done", label: t("suite.new.stepDone") },
  ];

  const [step, setStep] = useState<Step>("name");
  const [suiteName, setSuiteName] = useState("");
  const [suiteId, setSuiteId] = useState("");
  const [links, setLinks] = useState<{ platform: string; url: string }[]>([
    { platform: "website", url: "" },
    { platform: "instagram", url: "" },
  ]);
  const [businessName, setBusinessName] = useState("");
  const [brand, setBrand] = useState<Brand | null>(null);
  const [error, setError] = useState("");
  const [extractLog, setExtractLog] = useState("");
  const [researchDebug, setResearchDebug] = useState<ResearchDebug | null>(null);
  const [strategy, setStrategy] = useState<MarketingStrategy | null>(null);
  const [strategyError, setStrategyError] = useState("");

  // Step A
  const [bizName, setBizName] = useState("");
  // Step B
  const [selectedNicheIdx, setSelectedNicheIdx] = useState(-1); // index into suggestions.niches
  const [selectedResearchNiche, setSelectedResearchNiche] = useState("");
  const [researchNicheOptions, setResearchNicheOptions] = useState<string[]>([]);
  const [customNiche, setCustomNiche] = useState("");
  const [showNicheInput, setShowNicheInput] = useState(false);
  // Step C
  const [orderedLangs, setOrderedLangs] = useState<string[]>([]);
  const [customLanguage, setCustomLanguage] = useState("");
  const [audienceDialect, setAudienceDialect] = useState("");
  // Step D
  const [serviceItems, setServiceItems] = useState<string[]>([]);
  // Step E
  const [locationScope, setLocationScope] = useState("Custom");
  const [customCountries, setCustomCountries] = useState("");
  const [customCities, setCustomCities] = useState("");
  const [audienceNotes, setAudienceNotes] = useState("");
  type AudiencePhase = "location" | "interests" | "behaviors" | "statuses" | "notes";
  const AUDIENCE_PHASES: AudiencePhase[] = ["location", "interests", "behaviors", "statuses", "notes"];
  const [audiencePhase, setAudiencePhase] = useState<AudiencePhase>("location");
  const [cityMode, setCityMode] = useState<"manual" | "radius">("manual");
  const [radiusKm, setRadiusKm] = useState(5);
  const [geo, setGeo] = useState<{ lat: number; lng: number; city?: string; country?: string } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState("");
  const ipCountryRequested = useRef(false);
  const [ipCountry, setIpCountry] = useState("");

  // Fetch the visitor's IP country once — used for the audience prefill and
  // the default dialect suggestion.
  useEffect(() => {
    if (ipCountryRequested.current) return;
    ipCountryRequested.current = true;
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        const country = String(data?.country_name || "").trim();
        if (country) setIpCountry(country);
      })
      .catch(() => undefined);
  }, []);

  // Adjust-during-render (no setState-in-effect): prefill the country on the
  // audience step, and suggest the Arab-48 dialect for Israeli Arabic suites.
  const ipPrefillKey = `${step}|${ipCountry}|${orderedLangs[0] || ""}`;
  const [prevIpPrefillKey, setPrevIpPrefillKey] = useState(ipPrefillKey);
  if (ipPrefillKey !== prevIpPrefillKey) {
    setPrevIpPrefillKey(ipPrefillKey);
    if (step === "step-e" && !customCountries && ipCountry) {
      setCustomCountries(ipCountry);
    }
    if (!audienceDialect && (orderedLangs[0] || "") === "ar" && /israel|إسرائيل|ישראל/i.test(ipCountry)) {
      setAudienceDialect(ARAB_48_DIALECT);
    }
  }

  function detectLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(t("suite.new.geoDenied"));
      return;
    }
    setGeoBusy(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let city = "";
        let country = "";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${lang}`
          );
          const data = await res.json();
          const address = data?.address || {};
          city = String(address.city || address.town || address.village || "").trim();
          country = String(address.country || "").trim();
        } catch {
          /* keep coordinates even without a reverse-geocoded name */
        }
        setGeo({ lat: latitude, lng: longitude, city, country });
        if (country) setCustomCountries((prev) => prev || country);
        if (city) setCustomCities((prev) => prev || city);
        setGeoBusy(false);
      },
      () => {
        setGeoError(t("suite.new.geoDenied"));
        setGeoBusy(false);
      },
      { enableHighAccuracy: false, timeout: 15000 }
    );
  }

  async function saveAudienceStep() {
    const countries = locationScope === "Custom"
      ? customCountries.split(",").map((c) => c.trim()).filter(Boolean)
      : locationScope === "Worldwide" ? [] : [locationScope];
    const cities = customCities.split(",").map((c) => c.trim()).filter(Boolean);
    const locationText = locationScope === "Worldwide"
      ? "Worldwide"
      : [...countries, ...cities].join(", ") || locationScope;
    const interestsText = selectedInterests.length > 0
      ? `, ${t("suite.new.targetAudienceInterestsLabel")}: ${selectedInterests.join(", ")}`
      : "";
    const behaviorText = selectedBehaviors.length > 0 ? `. ${t("suite.new.targetAudienceBehaviorsLabel")}: ${selectedBehaviors.join(", ")}` : "";
    const statusText = selectedStatuses.length > 0 ? `. ${t("suite.new.targetAudienceStatusesLabel")}: ${selectedStatuses.join(", ")}` : "";
    const notesText = audienceNotes.trim() ? `. ${t("suite.new.targetAudienceNotesLabel")}: ${audienceNotes.trim()}` : "";
    const targetAudience = `${locationText}${interestsText}${behaviorText}${statusText}${notesText}`;
    const radius = cityMode === "radius" && geo
      ? { lat: geo.lat, lng: geo.lng, km: radiusKm, city: geo.city || "", country: geo.country || "" }
      : undefined;
    await saveStep("e", {
      audience_location: {
        scope: locationScope === "Worldwide" ? "world" : "custom",
        countries,
        cities,
        ...(radius ? { radius } : {}),
      },
      audience_interests: selectedInterests,
      audience_behaviors: selectedBehaviors,
      audience_social_statuses: selectedStatuses,
      audience_notes: audienceNotes,
      target_audience: targetAudience,
    });
    setStep("step-f");
  }
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  // Step F
  const [uspPoints, setUspPoints] = useState<string[]>([]);
  const [espPoints, setEspPoints] = useState<string[]>([]);
  // Step G
  const [generatingLogo, setGeneratingLogo] = useState(false);
  const [generatingColors, setGeneratingColors] = useState(false);
  const [generatingFonts, setGeneratingFonts] = useState(false);
  const [logoStyle, setLogoStyle] = useState<"icon_only" | "with_name" | "initials">("icon_only");
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [personas, setPersonas] = useState<BrandPersona[]>([]);
  const [newPersonaName, setNewPersonaName] = useState("");
  const [localColors, setLocalColors] = useState<{ primary: string; secondary: string; accent: string }>({
    primary: "#0a0a0a", secondary: "#f8d84a", accent: "#ff4fa3",
  });

  function goBack() {
    const previous: Partial<Record<Step, Step>> = {
      links: "name",
      extracting: "links",
      "step-a": "links",
      "step-b": "step-a",
      "step-c": "step-b",
      "step-d": "step-c",
      "step-e": "step-d",
      "step-f": "step-e",
      "step-g": "step-f",
      "step-h": "step-g",
      strategy: "step-h",
      preview: "step-h",
    };
    const target = previous[step];
    if (target) setStep(target);
  }

  const canGoBack = step !== "name" && step !== "done";
  const languageLabel = (code: string) => {
    if (code.startsWith("custom:")) return code.slice("custom:".length);
    return LANGUAGES.find((l) => l.code === code)?.label || code;
  };
  const languageDir = (code: string) => {
    if (code.startsWith("custom:")) return "auto";
    return LANGUAGES.find((l) => l.code === code)?.dir || "ltr";
  };
  const selectedNicheLabel = selectedResearchNiche || (selectedNicheIdx >= 0 ? suggestions.niches[selectedNicheIdx] : customNiche);
  const derivedInterestKey = (selectedNicheLabel || brand?.industry || "").toLowerCase();
  const metaInterestKey = derivedInterestKey.includes("pet") || derivedInterestKey.includes("חיות") || derivedInterestKey.includes("حيوان")
    ? "pets"
    : derivedInterestKey.includes("restaurant") || derivedInterestKey.includes("food") || derivedInterestKey.includes("مطعم") || derivedInterestKey.includes("אוכל")
      ? "restaurant"
      : derivedInterestKey.includes("fashion") || derivedInterestKey.includes("beauty") || derivedInterestKey.includes("אופנה") || derivedInterestKey.includes("جمال")
        ? "fashion"
        : derivedInterestKey.includes("real") || derivedInterestKey.includes("נדל") || derivedInterestKey.includes("عقار")
          ? "realestate"
          : derivedInterestKey.includes("marketing") || derivedInterestKey.includes("שיווק") || derivedInterestKey.includes("تسويق")
            ? "marketing"
            : "default";
  // Suite-specific interests first (extraction + services + niche-mapped Meta
  // interests). The generic static list only appears when nothing specific exists.
  const suiteSpecificInterests = [
    ...((brand?.audience_interests || []).filter(Boolean)),
    ...((brand?.content_themes || []).filter(Boolean)),
    ...(brand?.services || []).slice(0, 5),
    ...(metaInterestKey !== "default" ? (META_INTERESTS[metaInterestKey] || []) : []),
  ].filter(Boolean);
  const nicheStaticInterests = suggestions.interests[selectedNicheLabel] || [];
  const audienceInterestSuggestions = Array.from(new Set([
    ...suiteSpecificInterests,
    ...nicheStaticInterests,
    ...(suiteSpecificInterests.length === 0 && nicheStaticInterests.length === 0
      ? [...(suggestions.interests["default"] || []), ...META_INTERESTS.default]
      : []),
  ].filter(Boolean)));
  const fallbackBehaviorSuggestions = [
    ...localizedAudienceBehaviors(lang, metaInterestKey),
    t("suite.new.behaviorOnlineBuyers"),
    t("suite.new.behaviorEngagedSocial"),
    t("suite.new.behaviorLocalSearch"),
    t("suite.new.behaviorPriceSensitive"),
    t("suite.new.behaviorPremiumBuyers"),
  ];
  const fallbackStatusSuggestions = [
    ...localizedAudienceStatuses(lang, metaInterestKey),
    t("suite.new.statusParents"),
    t("suite.new.statusBusinessOwners"),
    t("suite.new.statusDoctors"),
    t("suite.new.statusEngaged"),
    t("suite.new.statusStudents"),
  ];
  const audienceBehaviorSuggestions = Array.from(new Set([
    ...((brand?.audience_behaviors || []).filter(Boolean)),
    ...((brand?.audience_behaviors || []).length > 0 ? [] : fallbackBehaviorSuggestions),
  ]));
  const audienceStatusSuggestions = Array.from(new Set([
    ...((brand?.audience_social_statuses || []).filter(Boolean)),
    ...((brand?.audience_social_statuses || []).length > 0 ? [] : fallbackStatusSuggestions),
  ]));
  const audienceNotesPlaceholder = (() => {
    const countryText = `${customCountries} ${customCities}`.toLowerCase();
    if (lang === "ar" && (countryText.includes("israel") || countryText.includes("إسرائيل") || countryText.includes("اسرائيل"))) {
      return t("suite.new.audienceNotesPlaceholderArIsrael");
    }
    if (lang === "he" && (countryText.includes("israel") || countryText.includes("ישראל"))) {
      return t("suite.new.audienceNotesPlaceholderHeIsrael");
    }
    return t("suite.new.audienceNotesPlaceholder");
  })();
  const brandLogos = brand?.brand_logos || [];
  const logoGroups = [
    { key: "square", label: "Square logos", items: brandLogos.filter((logo) => logo.shape === "square") },
    { key: "horizontal", label: "Horizontal logos", items: brandLogos.filter((logo) => logo.shape === "horizontal") },
    { key: "other", label: "Other logos", items: brandLogos.filter((logo) => !["square", "horizontal"].includes(logo.shape || "")) },
  ].filter((group) => group.items.length > 0);

  // ── Step 1: name ─────────────────────────────────────────────────────────

  async function handleCreateSuite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const suite = await api.suites.create({ name: suiteName });
      setSuiteId(suite.id);
      setBusinessName(suiteName);
      const accountType = localStorage.getItem("co_suite_account_type");
      if (accountType) {
        api.onboarding.saveBrandStep({
          suite_id: suite.id,
          step: "account-type",
          data: { account_type: accountType },
        }).catch(() => {});
      }
      setStep("links");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  // ── Step 2: links ─────────────────────────────────────────────────────────

  function addLink() {
    setLinks((l) => [...l, { platform: "other", url: "" }]);
  }

  function removeLink(i: number) {
    setLinks((l) => l.filter((_, idx) => idx !== i));
  }

  function setLinkUrl(i: number, url: string) {
    setLinks((l) => l.map((item, idx) => idx === i ? { ...item, url } : item));
  }

  function setLinkPlatform(i: number, platform: string) {
    setLinks((l) => l.map((item, idx) => idx === i ? { ...item, platform } : item));
  }

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const urls = links.map((l) => l.url).filter(Boolean);
    if (urls.length === 0) {
      setError(t("suite.new.researchError"));
      return;
    }
    setResearchDebug(null);
    setStep("extracting");
    setExtractLog(t("suite.new.extractLogScraping"));
    const t1 = setTimeout(() => setExtractLog(t("suite.new.extractLogSearch")), 4000);
    const t2 = setTimeout(() => setExtractLog(t("suite.new.extractLogAnalyze")), 9000);
    try {
      const res = await api.onboarding.extractBrand({
        suite_id: suiteId,
        urls,
        business_name: businessName || suiteName,
        user_language: lang,
      });
      clearTimeout(t1);
      clearTimeout(t2);
      setBrand(res.brand);
      setResearchDebug(res.research_debug || res.brand?.research_debug || null);
      setBizName(res.brand?.name || suiteName);
      const researchedNiches = Array.from(new Set([
        res.brand?.industry,
        res.brand?.niche,
        ...(res.brand?.content_themes || []).slice(0, 3),
      ].filter((item): item is string => Boolean(item?.trim()))));
      setResearchNicheOptions(researchedNiches);
      const foundNicheIdx = findNicheIndex(res.brand?.industry || "");
      setSelectedNicheIdx(foundNicheIdx);
      setSelectedResearchNiche(foundNicheIdx >= 0 ? "" : (researchedNiches[0] || ""));
      setOrderedLangs(res.brand?.audience_languages || []);
      const dialectContextCountries = [
        ...(res.brand?.audience_location?.countries || []),
        res.brand?.location || "",
        ipCountry,
      ].join(", ");
      setAudienceDialect(
        suggestedDialect(res.brand?.dialect || "", res.brand?.audience_languages || [], dialectContextCountries)
      );
      setAudienceNotes(res.brand?.audience_notes || "");
      const audienceLocation = res.brand?.audience_location;
      setLocationScope("Custom");
      // Country field keeps ONLY the country — any city in the extracted
      // location string moves to the cities field.
      const extractedLocation = String(res.brand?.location || "");
      const locationParts = extractedLocation.split(",").map((part) => part.trim()).filter(Boolean);
      const extractedCountry = locationParts.length > 1 ? locationParts[locationParts.length - 1] : extractedLocation;
      const extractedCity = locationParts.length > 1 ? locationParts.slice(0, -1).join(", ") : "";
      setCustomCountries((audienceLocation?.countries || []).join(", ") || extractedCountry || "");
      setCustomCities((audienceLocation?.cities || []).join(", ") || extractedCity);
      setSelectedInterests(res.brand?.audience_interests || []);
      setSelectedBehaviors(res.brand?.audience_behaviors || []);
      setSelectedStatuses(res.brand?.audience_social_statuses || []);
      setPersonas(res.brand?.brand_personas || []);
      setServiceItems([...(res.brand?.services || []), ...(res.brand?.products || [])].filter(Boolean));
      // Pre-fill USP/ESP — translate to user's language if not English
      const rawUsp = res.brand?.unique_value || "";
      const rawEsp = res.brand?.esp || "";
      const rawHelp = res.brand?.how_they_help || "";

      if (lang !== "en" && (rawUsp || rawEsp || rawHelp)) {
        setUspPoints(rawUsp ? [rawUsp] : []);
        setEspPoints(rawEsp ? [rawEsp] : []);
        try {
          const translated = await api.onboarding.translateBrandFields({
            unique_value: rawUsp,
            esp: rawEsp,
            how_they_help: rawHelp,
            target_language: lang,
          });
          if (translated.unique_value) setUspPoints([translated.unique_value]);
          if (translated.esp) setEspPoints([translated.esp]);
        } catch {
          // Keep originals on failure
        }
      } else {
        setUspPoints(res.brand?.usp_points || (rawUsp ? [rawUsp] : []));
        setEspPoints(res.brand?.esp_points || (rawEsp ? [rawEsp] : []));
      }
      setLocalColors({
        primary: res.brand?.colors?.primary || "#0a0a0a",
        secondary: res.brand?.colors?.secondary || "#f8d84a",
        accent: res.brand?.colors?.accent || "#ff4fa3",
      });
      setStep("step-a");
    } catch {
      clearTimeout(t1);
      clearTimeout(t2);
      setBizName(suiteName);
      setSelectedNicheIdx(-1);
      setSelectedResearchNiche("");
      setResearchNicheOptions([]);
      setOrderedLangs([]);
      setServiceItems([]);
      setResearchDebug(null);
      setStep("step-a");
    }
  }

  async function runGenerateStrategy() {
    setStrategyError("");
    try {
      const res = await api.onboarding.generateStrategy({ suite_id: suiteId, user_language: lang });
      setStrategy(res.strategy);
      setStep("preview");
    } catch (err: unknown) {
      setStrategyError(err instanceof Error ? err.message : "Strategy generation failed. Please try again.");
    }
  }

  async function saveStep(step: string, data: Partial<Brand>) {
    try {
      await api.onboarding.saveBrandStep({ suite_id: suiteId, step, data });
      setBrand(prev => ({ ...(prev || {}), ...data }));
    } catch {
      // non-fatal
    }
  }

  async function generateAssets(types: string[]) {
    if (types.includes("logo")) setGeneratingLogo(true);
    if (types.includes("colors")) setGeneratingColors(true);
    if (types.includes("fonts")) setGeneratingFonts(true);
    try {
      const res = await api.onboarding.generateBrandAssets({
        suite_id: suiteId,
        generate: types,
        logo_style: logoStyle,
        user_language: lang,
      });
      setBrand(res.brand);
      if (res.brand.colors) {
        setLocalColors({
          primary: res.brand.colors.primary || localColors.primary,
          secondary: res.brand.colors.secondary || localColors.secondary,
          accent: res.brand.colors.accent || localColors.accent,
        });
      }
    } catch {
      // ignore
    } finally {
      if (types.includes("logo")) setGeneratingLogo(false);
      if (types.includes("colors")) setGeneratingColors(false);
      if (types.includes("fonts")) setGeneratingFonts(false);
    }
  }

  async function uploadBrandAsset(assetType: "logo" | "font", file: File, language?: string) {
    // Show local preview immediately for logos (before R2 upload completes)
    if (assetType === "logo") {
      const localUrl = URL.createObjectURL(file);
      setBrand((prev) => ({ ...(prev || {}), logo_url: localUrl, logo_source: "uploaded" }));
    }
    setUploadingAsset(true);
    try {
      const res = await api.onboarding.uploadBrandAsset(suiteId, assetType, file, language);
      setBrand(res.brand);
    } catch {
      // local preview stays even if upload fails
    } finally {
      setUploadingAsset(false);
    }
  }

  async function uploadLogoFiles(files: File[]) {
    if (files.length === 0) return;
    setUploadingAsset(true);
    const localLogos = await Promise.all(files.map(buildLocalLogoPreview));
    setBrand((prev) => ({
      ...(prev || {}),
      logo_url: localLogos[0]?.url || prev?.logo_url,
      logo_source: "uploaded",
      brand_logos: [...(prev?.brand_logos || []), ...localLogos],
    }));

    let latestBrand: Brand | null = null;
    for (const file of files) {
      try {
        const res = await api.onboarding.uploadBrandAsset(suiteId, "logo", file);
        latestBrand = res.brand;
      } catch {
        // Keep local previews visible when storage upload is unavailable.
      }
    }
    if (latestBrand) setBrand(latestBrand);
    setUploadingAsset(false);
  }

  async function setPrimaryLogo(logo: BrandLogo) {
    setBrand((prev) => ({ ...(prev || {}), logo_url: logo.url, logo_source: "uploaded" }));
    await saveStep("g-logo-primary", { logo_url: logo.url, logo_source: "uploaded" });
  }

  async function uploadPersonaImages(personaName: string, files: FileList | File[]) {
    const name = personaName.trim();
    if (!name) return;
    setUploadingAsset(true);
    try {
      for (const file of Array.from(files)) {
        const res = await api.onboarding.uploadPersonaAsset(suiteId, file, name);
        setBrand(res.brand);
        setPersonas(res.brand.brand_personas || []);
      }
    } finally {
      setUploadingAsset(false);
    }
  }

  async function saveColors() {
    await saveStep("g-colors", {
      colors: { primary: localColors.primary, secondary: localColors.secondary, accent: localColors.accent },
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-start justify-center px-4 py-8" dir={dir}>
      <div className="w-full max-w-3xl">
      <div className="mb-6 rounded-3xl border border-border bg-card/70 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex gap-1">
              <span className="h-1.5 w-8 rounded-full bg-[#f8d84a]" />
              <span className="h-1.5 w-8 rounded-full bg-[#ff4fa3]" />
              <span className="h-1.5 w-8 rounded-full bg-[#2f80ff]" />
            </div>
            <h1 className="text-2xl font-black tracking-normal text-foreground">{t("suite.new.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("suite.new.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            <Info size={14} className="text-[#2f80ff]" />
            <span>{t("suite.new.info")}</span>
          </div>
        </div>
      </div>

      <StepIndicator current={step} steps={STEPS} />
      {canGoBack && (
        <button
          type="button"
          onClick={goBack}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <BackIcon size={15} /> {t("suite.new.back")}
        </button>
      )}

      {/* ── Step 1: Name ── */}
      {step === "name" && (
        <div className="space-y-4">
          <Card className="border-border bg-card text-card-foreground shadow-sm">
            <CardHeader>
              <CardTitle>{t("suite.new.nameQuestion")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("suite.new.nameHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSuite} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("suite.new.nameLabel")}</Label>
                  <Input
                    value={suiteName}
                    onChange={(e) => setSuiteName(e.target.value)}
                    placeholder={t("suite.new.namePlaceholder")}
                    required
                    className="bg-background text-lg font-semibold"
                    dir="auto"
                  />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" className="bg-foreground text-background hover:bg-foreground/90 gap-2">
                  {t("suite.new.continue")} <ForwardIcon size={16} />
                </Button>
              </form>
            </CardContent>
          </Card>

          <button
            type="button"
            onClick={() => router.push("/create")}
            className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-[#2f80ff]/50 bg-[#2f80ff]/5 p-5 text-start transition hover:border-[#2f80ff] hover:bg-[#2f80ff]/10"
          >
            <div className="min-w-0">
              <p className="text-base font-bold text-foreground" dir="auto">{quickCreateCopy.title}</p>
              <p className="mt-1 text-sm text-muted-foreground" dir="auto">{quickCreateCopy.desc}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-3 py-2 text-sm font-semibold text-background">
              {quickCreateCopy.cta} <ForwardIcon size={15} />
            </span>
          </button>
        </div>
      )}

      {/* ── Step 2: Links ── */}
      {step === "links" && (
        <form onSubmit={handleExtract} className="space-y-4">
          <Card className="border-border bg-card text-card-foreground shadow-sm">
            <CardHeader>
              <CardTitle>{t("suite.new.addLinks")}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("suite.new.addLinksDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Business name override */}
              <div className="space-y-1.5 rounded-2xl border border-border bg-background/60 p-4">
                <Label className="text-muted-foreground text-xs">{t("suite.new.businessOverride")}</Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={suiteName}
                  className="bg-background text-sm"
                  dir="auto"
                />
              </div>

              {/* Link rows */}
              <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
                {links.map((link, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    {/* Platform selector */}
                    <select
                      value={link.platform}
                      onChange={(e) => setLinkPlatform(i, e.target.value)}
                      className="bg-background border border-border text-foreground text-xs rounded-md px-2 py-2 h-9 shrink-0 focus:outline-none focus:ring-1 focus:ring-[#2f80ff]"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>

                    {/* URL input */}
                    <Input
                      value={link.url}
                      onChange={(e) => setLinkUrl(i, e.target.value)}
                      placeholder={platformPlaceholder(link.platform, lang)}
                      className="bg-background text-sm flex-1"
                      dir={isRtl ? "rtl" : "ltr"}
                    />

                    {/* Remove button */}
                    {links.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLink(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors mt-2"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add link button */}
              <button
                type="button"
                onClick={addLink}
                className="flex items-center gap-1.5 text-[#2f80ff] hover:underline text-xs transition-colors"
              >
                <Plus size={13} /> {t("suite.new.addAnotherLink")}
              </button>

              {/* Platform badges hint */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Website", "Instagram", "Facebook", "TikTok", "LinkedIn"].map((p) => (
                  <span key={p} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                    {p}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" className="bg-foreground text-background hover:bg-foreground/90 gap-2">
              <AtSign size={15} /> {t("suite.new.researchBtn")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("name")}
              className="text-muted-foreground hover:text-foreground"
            >
              <BackIcon size={15} /> {t("suite.new.back")}
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 3: Extracting ── */}
      {step === "extracting" && (
        <div className="text-center py-16 space-y-4">
          <Loader2 size={44} className="text-[#2f80ff] animate-spin mx-auto" />
          <div>
            <p className="text-foreground font-medium text-lg">{t("suite.new.analyzing")}</p>
            <p className="text-muted-foreground text-sm mt-2 transition-all">{extractLog}</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground mt-6">
            <span>{t("suite.new.extractBullet1")}</span>
            <span>{t("suite.new.extractBullet2")}</span>
            <span>{t("suite.new.extractBullet3")}</span>
            <span>{t("suite.new.extractBullet4")}</span>
          </div>
        </div>
      )}

      {/* ── Step A: Business Name ── */}
      {step === "step-a" && (
        <div className="space-y-4">
          <ResearchDebugPanel debug={researchDebug} lang={lang} />
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>{t("suite.new.stepATitle")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("suite.new.stepASubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <Input
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="bg-background text-foreground text-lg font-medium"
                  dir="auto"
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              await saveStep("a", { name: bizName });
              setStep("step-b");
            }} className="bg-foreground text-background hover:bg-foreground/90 gap-2">
              <ForwardIcon size={15} /> {t("suite.new.confirmName")}
            </Button>
            <button onClick={() => setStep("step-b")} className="text-muted-foreground text-sm hover:text-foreground">{t("suite.new.skip")}</button>
          </div>
        </div>
      )}

      {/* ── Step B: Category / Niche ── */}
      {step === "step-b" && (
        <div className="space-y-4">
          <ResearchDebugPanel debug={researchDebug} lang={lang} />
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>{t("suite.new.stepBTitle")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("suite.new.stepBSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-background/60 p-4">
                {researchNicheOptions.length > 0 && (
                  <span className="w-full text-xs text-muted-foreground">{t("suite.new.researchSuggestions")}</span>
                )}
                {researchNicheOptions.map((n, idx) => (
                  <button
                    key={`research-${idx}-${n}`}
                    onClick={() => {
                      setSelectedResearchNiche(n);
                      setSelectedNicheIdx(-1);
                      setShowNicheInput(false);
                      setCustomNiche("");
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedResearchNiche === n
                        ? "bg-foreground border-foreground text-background"
                        : "border-[#2f80ff]/40 bg-[#2f80ff]/10 text-foreground hover:border-foreground"
                    }`}
                    dir="auto"
                  >{n}</button>
                ))}
                {suggestions.niches.map((n, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedNicheIdx(idx);
                      setSelectedResearchNiche("");
                      setShowNicheInput(false);
                      setCustomNiche("");
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedNicheIdx === idx
                        ? "bg-foreground border-foreground text-background"
                        : "border-border text-muted-foreground hover:border-zinc-500"
                    }`}
                    dir="auto"
                  >{n}</button>
                ))}
                <button
                  onClick={() => { setShowNicheInput(true); setSelectedNicheIdx(-1); setSelectedResearchNiche(""); }}
                  className="px-3 py-1.5 rounded-full text-sm border border-dashed border-zinc-600 text-muted-foreground hover:border-zinc-400"
                >{t("suite.new.otherNiche")}</button>
              </div>
              {showNicheInput && (
                <Input
                  value={customNiche}
                  onChange={(e) => setCustomNiche(e.target.value)}
                  placeholder={t("suite.new.nichePlaceholder")}
                  className="bg-background text-foreground"
                  dir="auto"
                  autoFocus
                />
              )}
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              const englishNiche = selectedResearchNiche || (selectedNicheIdx >= 0 ? getEnglishNiche(selectedNicheIdx) : customNiche);
              const localNiche = selectedResearchNiche || (selectedNicheIdx >= 0 ? suggestions.niches[selectedNicheIdx] : customNiche);
              if (englishNiche) await saveStep("b", { niche: localNiche, industry: englishNiche });
              setStep("step-c");
            }} className="bg-foreground text-background hover:bg-foreground/90 gap-2">
              <ForwardIcon size={15} /> {t("suite.new.confirmCategory")}
            </Button>
            <button onClick={() => setStep("step-c")} className="text-muted-foreground text-sm hover:text-foreground">{t("suite.new.skip")}</button>
          </div>
        </div>
      )}

      {/* ── Step C: Audience Languages ── */}
      {step === "step-c" && (
        <div className="space-y-4">
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>{t("suite.new.stepCTitle")}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("suite.new.stepCSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-background/60 p-4">
                {LANGUAGES.filter((l) => !orderedLangs.includes(l.code)).map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setOrderedLangs((prev) => [...prev, l.code])}
                    dir={l.dir}
                    className="px-3 py-1.5 rounded-full text-sm border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                  >{l.label}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  placeholder={t("suite.new.customLanguagePlaceholder")}
                  className="bg-background text-foreground text-sm"
                  dir="auto"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const value = customLanguage.trim();
                    if (!value) return;
                    const key = `custom:${value}`;
                    setOrderedLangs((prev) => prev.includes(key) ? prev : [...prev, key]);
                    setCustomLanguage("");
                  }}
                >
                  {t("suite.new.add")}
                </Button>
              </div>
              {orderedLangs.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs font-semibold text-foreground">{t("suite.new.selectedOrder")}</p>
                  {orderedLangs.map((code, idx) => {
                    return (
                      <div key={code} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
                        <span className="text-xs text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                        <span className="text-foreground flex-1 text-sm" dir={languageDir(code)}>{languageLabel(code)}</span>
                        {idx === 0 && <span className="text-xs text-[#2f80ff] bg-[#2f80ff]/10 px-1.5 py-0.5 rounded">{t("suite.new.langMain")}</span>}
                        <button
                          onClick={() => setOrderedLangs((prev) => {
                            const arr = [...prev];
                            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                            return arr;
                          })}
                          disabled={idx === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 px-1"
                        >↑</button>
                        <button
                          onClick={() => setOrderedLangs((prev) => {
                            const arr = [...prev];
                            [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                            return arr;
                          })}
                          disabled={idx === orderedLangs.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 px-1"
                        >↓</button>
                        <button
                          onClick={() => setOrderedLangs((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-muted-foreground hover:text-red-400 px-1 transition-colors"
                        >✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-semibold text-foreground">{t("suite.new.dialectLabel")}</p>
                <Input
                  value={audienceDialect}
                  onChange={(e) => setAudienceDialect(e.target.value)}
                  placeholder={t("suite.new.dialectPlaceholder")}
                  className="bg-background text-foreground text-sm"
                  dir="auto"
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              if (orderedLangs.length > 0) {
                await saveStep("c", {
                  audience_languages: orderedLangs,
                  audience_language_names: orderedLangs.map(languageLabel),
                  dialect: audienceDialect.trim()
                    || (orderedLangs[0]?.startsWith("custom:") ? languageLabel(orderedLangs[0]) : (LANG_TO_DIALECT[orderedLangs[0]] || "English")),
                });
              }
              setStep("step-d");
            }} className="bg-foreground text-background hover:bg-foreground/90 gap-2">
              <ForwardIcon size={15} /> {t("suite.new.confirmLanguages")}
            </Button>
            <button onClick={() => setStep("step-d")} className="text-muted-foreground text-sm hover:text-foreground">{t("suite.new.skip")}</button>
          </div>
        </div>
      )}

      {/* ── Step D: Products / Services ── */}
      {step === "step-d" && (
        <div className="space-y-4">
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>{t("suite.new.stepDTitle")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("suite.new.stepDSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
              {serviceItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={item}
                    onChange={(e) => setServiceItems((prev) => prev.map((s, idx) => idx === i ? e.target.value : s))}
                    className="flex-1 bg-background text-foreground text-sm"
                    dir="auto"
                  />
                  <button
                    onClick={() => setServiceItems((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                  ><X size={14} /></button>
                </div>
              ))}
              {serviceItems.length === 0 && (
                <p className="text-muted-foreground text-sm">{t("suite.new.noServices")}</p>
              )}
              <button
                onClick={() => setServiceItems((prev) => [...prev, ""])}
                className="flex items-center gap-1.5 text-[#2f80ff] hover:underline text-sm transition-colors"
              ><Plus size={13} /> {t("suite.new.addService")}</button>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              const services = serviceItems.filter(Boolean);
              if (services.length > 0) await saveStep("d", { services });
              setStep("step-e");
            }} className="bg-foreground text-background hover:bg-foreground/90 gap-2">
              <ForwardIcon size={15} /> {t("suite.new.confirmServices")}
            </Button>
            <button onClick={() => setStep("step-e")} className="text-muted-foreground text-sm hover:text-foreground">{t("suite.new.skip")}</button>
          </div>
        </div>
      )}

      {/* ── Step E: Audience — split into focused sub-screens ── */}
      {step === "step-e" && (
        <div className="space-y-4">
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{t("suite.new.stepETitle")}</CardTitle>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                  {AUDIENCE_PHASES.indexOf(audiencePhase) + 1}/{AUDIENCE_PHASES.length}
                </span>
              </div>
              <CardDescription className="text-muted-foreground">
                {audiencePhase === "location"
                  ? t("suite.new.location")
                  : audiencePhase === "interests"
                    ? t("suite.new.interests")
                    : audiencePhase === "behaviors"
                      ? t("suite.new.behaviors")
                      : audiencePhase === "statuses"
                        ? t("suite.new.socialStatus")
                        : t("suite.new.audienceNotes")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {audiencePhase === "location" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-foreground">{t("suite.new.location")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {LOCATION_SCOPES.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setLocationScope(value)}
                          className={`max-w-full px-3 py-1.5 rounded-full text-sm border transition-colors text-start leading-snug ${
                            locationScope === value
                              ? "bg-foreground border-foreground text-background"
                              : "border-border text-muted-foreground hover:border-zinc-500"
                          }`}
                          dir="auto"
                        >{label}</button>
                      ))}
                    </div>
                    {locationScope === "Custom" && (
                      <Input
                        value={customCountries}
                        onChange={(e) => setCustomCountries(e.target.value)}
                        placeholder={t("suite.new.customCountriesPlaceholder")}
                        className="bg-background text-foreground text-sm"
                        dir="auto"
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-foreground">{t("suite.new.targetAreaTitle")}</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TargetAreaCard
                        selected={cityMode === "manual"}
                        icon={<Building2 size={18} />}
                        title={t("suite.new.cityManual")}
                        description={t("suite.new.cityManualDesc")}
                        onClick={() => setCityMode("manual")}
                      />
                      <TargetAreaCard
                        selected={cityMode === "radius"}
                        icon={<MapPin size={18} />}
                        title={t("suite.new.cityRadius")}
                        description={t("suite.new.cityRadiusDesc")}
                        onClick={() => setCityMode("radius")}
                      />
                    </div>
                    <div className="rounded-2xl border border-border bg-background/60 p-4">
                      {cityMode === "manual" ? (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">{t("suite.new.customCitiesPlaceholder")}</Label>
                          <Input
                            value={customCities}
                            onChange={(e) => setCustomCities(e.target.value)}
                            placeholder={t("suite.new.customCitiesPlaceholder")}
                            className="bg-background text-foreground text-sm"
                            dir="auto"
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Button type="button" onClick={detectLocation} disabled={geoBusy} className="w-full justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 sm:w-auto">
                            {geoBusy ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
                            {geoBusy ? t("suite.new.locating") : t("suite.new.useMyLocation")}
                          </Button>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{t("suite.new.radiusLabel")}</span>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={100}
                              value={radiusKm}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                setRadiusKm(Number.isFinite(value) ? Math.min(100, Math.max(1, value)) : 1);
                              }}
                              className="w-24 bg-background text-center text-sm"
                              dir="ltr"
                            />
                            <span className="text-sm text-muted-foreground">km</span>
                            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
                            {[1, 3, 5, 10, 25].map((km) => (
                              <button
                                key={km}
                                type="button"
                                onClick={() => setRadiusKm(km)}
                                className={`rounded-full border px-3 py-1 text-sm transition-colors ${radiusKm === km ? "bg-foreground border-foreground text-background" : "border-border text-muted-foreground hover:border-zinc-500"}`}
                              >{km}</button>
                            ))}
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">{t("suite.new.geoConsentHint")}</p>
                          {geoError && <p className="text-xs text-red-500" dir="auto">{geoError}</p>}
                          {geo && (
                            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm" dir="auto">
                              <p className="font-semibold text-foreground">{t("suite.new.geoDetected")}</p>
                              <p className="mt-1 text-muted-foreground">
                                {[geo.city, geo.country].filter(Boolean).join("، ")} · {radiusKm} km
                              </p>
                              <p className="text-xs text-muted-foreground" dir="ltr">
                                {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {audiencePhase === "interests" && (
                <AudienceChipsSection
                  title={t("suite.new.interests")}
                  addAllLabel={t("suite.new.addAllSuggestions")}
                  addLabel={t("suite.new.add")}
                  placeholder={t("suite.new.customInterestPlaceholder")}
                  suggestions={audienceInterestSuggestions}
                  selected={selectedInterests}
                  setSelected={setSelectedInterests}
                />
              )}
              {audiencePhase === "behaviors" && (
                <AudienceChipsSection
                  title={t("suite.new.behaviors")}
                  addAllLabel={t("suite.new.addAllSuggestions")}
                  addLabel={t("suite.new.add")}
                  placeholder={t("suite.new.customBehaviorPlaceholder")}
                  suggestions={audienceBehaviorSuggestions}
                  selected={selectedBehaviors}
                  setSelected={setSelectedBehaviors}
                />
              )}
              {audiencePhase === "statuses" && (
                <AudienceChipsSection
                  title={t("suite.new.socialStatus")}
                  addAllLabel={t("suite.new.addAllSuggestions")}
                  addLabel={t("suite.new.add")}
                  placeholder={t("suite.new.customStatusPlaceholder")}
                  suggestions={audienceStatusSuggestions}
                  selected={selectedStatuses}
                  setSelected={setSelectedStatuses}
                />
              )}
              {audiencePhase === "notes" && (
                <div className="space-y-2">
                  <Label className="text-foreground">{t("suite.new.audienceNotes")}</Label>
                  <textarea
                    value={audienceNotes}
                    onChange={(e) => setAudienceNotes(e.target.value)}
                    placeholder={audienceNotesPlaceholder}
                    className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-[#2f80ff]"
                    dir="auto"
                  />
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {audiencePhase !== "notes" ? (
              <Button
                onClick={() => setAudiencePhase(AUDIENCE_PHASES[AUDIENCE_PHASES.indexOf(audiencePhase) + 1])}
                className="w-full justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 sm:w-auto"
              >
                <ForwardIcon size={15} /> {t("suite.new.audienceNext")}
              </Button>
            ) : (
              <Button onClick={saveAudienceStep} className="w-full justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 sm:w-auto">
                <ForwardIcon size={15} /> {t("suite.new.confirmAudience")}
              </Button>
            )}
            {audiencePhase !== "location" && (
              <button
                onClick={() => setAudiencePhase(AUDIENCE_PHASES[AUDIENCE_PHASES.indexOf(audiencePhase) - 1])}
                className="min-h-10 text-sm text-muted-foreground hover:text-foreground sm:px-2"
              >{t("suite.new.audienceBack")}</button>
            )}
            <button onClick={() => setStep("step-f")} className="min-h-10 text-sm text-muted-foreground hover:text-foreground sm:px-2">{t("suite.new.skip")}</button>
          </div>
        </div>
      )}

      {/* ── Step F: Why Choose You ── */}
      {step === "step-f" && (
        <div className="space-y-4">
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>{t("suite.new.stepFTitle")}</CardTitle>
              <CardDescription className="text-muted-foreground" dir="auto">
                {t("suite.new.stepFSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
                <Label className="text-foreground">{t("suite.new.uspLabel")}</Label>
                {uspPoints.map((point, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={point}
                      onChange={(e) => setUspPoints((prev) => prev.map((p, idx) => idx === i ? e.target.value : p))}
                      className="min-h-11 flex-1 bg-background text-sm text-foreground"
                      dir="auto"
                    />
                    <button onClick={() => setUspPoints((prev) => prev.filter((_, idx) => idx !== i))}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-red-400"><X size={14} /></button>
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.usp.filter((s) => !uspPoints.includes(s)).map((s) => (
                    <button key={s} onClick={() => setUspPoints((prev) => [...prev, s])}
                      className="max-w-full rounded-full border border-border px-3 py-1.5 text-start text-xs leading-snug text-muted-foreground transition-colors hover:border-foreground hover:text-[#2f80ff]"
                      dir="auto"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setUspPoints((prev) => Array.from(new Set([...prev, ...suggestions.usp])))}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15 sm:w-auto"
                  >
                    {t("suite.new.addAllSuggestions")}
                  </button>
                  <button onClick={() => setUspPoints((prev) => [...prev, ""])}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-[#2f80ff] transition-colors hover:bg-muted sm:w-auto">
                    <Plus size={13} /> {t("suite.new.addPoint")}
                  </button>
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
                <Label className="text-foreground">{t("suite.new.espLabel")}</Label>
                {espPoints.map((point, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={point}
                      onChange={(e) => setEspPoints((prev) => prev.map((p, idx) => idx === i ? e.target.value : p))}
                      className="min-h-11 flex-1 bg-background text-sm text-foreground"
                      dir="auto"
                    />
                    <button onClick={() => setEspPoints((prev) => prev.filter((_, idx) => idx !== i))}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-red-400"><X size={14} /></button>
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.esp.filter((s) => !espPoints.includes(s)).map((s) => (
                    <button key={s} onClick={() => setEspPoints((prev) => [...prev, s])}
                      className="max-w-full rounded-full border border-border px-3 py-1.5 text-start text-xs leading-snug text-muted-foreground transition-colors hover:border-foreground hover:text-[#2f80ff]"
                      dir="auto"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEspPoints((prev) => Array.from(new Set([...prev, ...suggestions.esp])))}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15 sm:w-auto"
                  >
                    {t("suite.new.addAllSuggestions")}
                  </button>
                  <button onClick={() => setEspPoints((prev) => [...prev, ""])}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-[#2f80ff] transition-colors hover:bg-muted sm:w-auto">
                    <Plus size={13} /> {t("suite.new.addPoint")}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Button onClick={async () => {
              const filteredUsp = uspPoints.filter(Boolean);
              const filteredEsp = espPoints.filter(Boolean);
              await saveStep("f", {
                usp_points: filteredUsp,
                esp_points: filteredEsp,
                unique_value: filteredUsp.join(". "),
                esp: filteredEsp.join(". "),
                how_they_help: filteredUsp[0] || brand?.how_they_help || "",
              });
              setStep("step-g");
            }} className="w-full justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 sm:w-auto">
              <ForwardIcon size={15} /> {t("suite.new.confirmWhyUs")}
            </Button>
            <button onClick={() => setStep("step-g")} className="min-h-10 text-sm text-muted-foreground hover:text-foreground sm:px-2">{t("suite.new.skip")}</button>
          </div>
        </div>
      )}

      {/* ── Step G: Brand Assets ── */}
      {step === "step-g" && (
        <div className="space-y-4">
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>{t("suite.new.stepGTitle")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("suite.new.stepGSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* ── LOGO ── */}
              <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
                <Label className="text-foreground">{t("suite.new.logoLabel")}</Label>

                {/* Logo preview */}
                <div className="flex items-start gap-4">
                  {brand?.logo_url ? (
                    <div className="relative">
                      <img
                        src={brand.logo_url}
                        alt="logo"
                        className="h-24 w-24 object-contain bg-muted rounded-xl border border-border p-2"
                      />
                      {brand.logo_source && (
                        <span className="absolute -top-1.5 -right-1.5 text-xs bg-zinc-700 text-foreground px-1.5 py-0.5 rounded-full">
                          {brand.logo_source === "ai-generated" ? "AI" : brand.logo_source === "uploaded" ? "↑" : "🔗"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="h-24 w-24 bg-muted rounded-xl border border-dashed border-zinc-600 flex items-center justify-center text-muted-foreground text-xs text-center p-2">
                      {t("suite.new.noLogoFound")}
                    </div>
                  )}
                  <div className="space-y-2 flex-1">
                    {/* Upload button */}
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer text-sm transition-colors w-full">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          await uploadLogoFiles(files);
                          e.currentTarget.value = "";
                        }}
                      />
                      {uploadingAsset ? <Loader2 size={14} className="animate-spin" /> : null}
                      {t("suite.new.uploadLogo")}
                    </label>
                    {logoGroups.length > 0 && (
                      <div className="space-y-3">
                        {logoGroups.map((group) => (
                          <div key={group.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-foreground">{group.label}</p>
                              <span className="text-[10px] text-muted-foreground">{group.items.length}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {group.items.map((logo) => (
                                <div key={`${logo.url}-${logo.name}`} className="rounded-lg border border-border bg-muted p-2">
                                  <img src={logo.url} alt={logo.name} className="h-14 w-full object-contain" />
                                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                                    <span>{logoShapeLabel(logo.shape)}</span>
                                    <span>{logo.background || "unknown"}</span>
                                    {logo.width && logo.height && <span>{logo.width}x{logo.height}</span>}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPrimaryLogo(logo)}
                                    className={`mt-2 w-full rounded-md border px-2 py-1 text-[11px] transition-colors ${
                                      brand?.logo_url === logo.url
                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        : "border-border text-muted-foreground hover:bg-background hover:text-foreground"
                                    }`}
                                  >
                                    {brand?.logo_url === logo.url ? t("suite.new.primaryLogo") : t("suite.new.setPrimaryLogo")}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Logo style selector */}
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">{t("suite.new.aiStyle")}</p>
                      <div className="flex gap-2">
                        {(["icon_only", "with_name", "initials"] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => setLogoStyle(style)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                              logoStyle === style
                                ? "bg-foreground border-foreground text-background"
                                : "border-border text-muted-foreground hover:border-zinc-500"
                            }`}
                          >
                            {style === "icon_only" ? t("suite.new.styleIconOnly") : style === "with_name" ? t("suite.new.styleWithName") : t("suite.new.styleInitials")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI generate */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateAssets(["logo"])}
                      disabled={generatingLogo}
                      className="border-border text-muted-foreground hover:bg-muted gap-2 w-full"
                    >
                      {generatingLogo ? <Loader2 size={13} className="animate-spin" /> : null}
                      {t("suite.new.generateLogo")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── COLORS ── */}
              <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
                <Label className="text-foreground">{t("suite.new.colorsLabel")}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(["primary", "secondary", "accent"] as const).map((key) => {
                    const hex = localColors[key] || "#000000";
                    const r = parseInt(hex.slice(1, 3), 16) || 0;
                    const g = parseInt(hex.slice(3, 5), 16) || 0;
                    const b = parseInt(hex.slice(5, 7), 16) || 0;
                    return (
                      <div key={key} className="space-y-1.5">
                        <p className="text-muted-foreground text-xs capitalize">{key}</p>
                        {/* Color swatch + native picker */}
                        <label className="relative cursor-pointer block">
                          <input
                            type="color"
                            value={localColors[key]}
                            onChange={(e) => setLocalColors((prev) => ({ ...prev, [key]: e.target.value }))}
                            onBlur={saveColors}
                            className="w-full h-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                          />
                        </label>
                        {/* Hex input */}
                        <input
                          type="text"
                          value={localColors[key]}
                          maxLength={7}
                          placeholder="#000000"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                              setLocalColors((prev) => ({ ...prev, [key]: v }));
                              if (v.length === 7) saveColors();
                            }
                          }}
                          className="w-full bg-muted border border-border text-foreground text-xs font-mono rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2f80ff]"
                        />
                        {/* RGB display */}
                        <p className="text-muted-foreground text-xs font-mono">
                          rgb({r}, {g}, {b})
                        </p>
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAssets(["colors"])}
                  disabled={generatingColors}
                  className="border-border text-muted-foreground hover:bg-muted gap-2"
                >
                  {generatingColors ? <Loader2 size={13} className="animate-spin" /> : null}
                  {t("suite.new.generateColors")}
                </Button>
              </div>

              {/* ── FONTS ── */}
              <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
                <Label className="text-foreground">{t("suite.new.fontsLabel")}</Label>

                {/* AI-suggested fonts */}
                {(brand?.font_suggestions || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(brand?.font_suggestions || []).map((f) => (
                      <span key={f} className="text-sm bg-muted text-foreground px-3 py-1.5 rounded-lg border border-border">{f}</span>
                    ))}
                  </div>
                )}

                {/* Font upload per language */}
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">{t("suite.new.uploadFontsPerLang")}</p>
                  {(orderedLangs.length > 0 ? orderedLangs : ["all"]).map((code) => {
                    const langName = code === "ar" ? "العربية" : code === "he" ? "עברית" : code === "en" ? "English" : code === "fr" ? "Français" : code === "es" ? "Español" : code === "tr" ? "Türkçe" : "All";
                    const uploadedFonts = (brand?.fonts_by_language?.[code] || brand?.fonts_by_language?.["all"] || []);
                    return (
                      <div key={code} className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2 sm:flex-row sm:items-center">
                        <span className="w-full shrink-0 text-sm text-foreground sm:w-20" dir={code === "ar" || code === "he" ? "rtl" : "ltr"}>{langName}</span>
                        <div className="flex flex-1 flex-wrap gap-1">
                          {uploadedFonts.map((font) => (
                            <span key={font.url} className="text-xs bg-zinc-700 text-foreground px-2 py-0.5 rounded">{font.name}</span>
                          ))}
                          {uploadedFonts.length === 0 && <span className="text-muted-foreground text-xs">{t("suite.new.noFontUploaded")}</span>}
                        </div>
                        <label className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-border px-2 text-xs text-[#2f80ff] transition-colors hover:bg-background shrink-0">
                          <input
                            type="file"
                            accept=".ttf,.otf,.woff,.woff2"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) await uploadBrandAsset("font", file, code);
                            }}
                          />
                          {uploadingAsset ? <Loader2 size={12} className="animate-spin inline" /> : t("suite.new.uploadFont")}
                        </label>
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAssets(["fonts"])}
                  disabled={generatingFonts}
                  className="border-border text-muted-foreground hover:bg-muted gap-2"
                >
                  {generatingFonts ? <Loader2 size={13} className="animate-spin" /> : null}
                  {t("suite.new.generateFonts")}
                </Button>
              </div>

            </CardContent>
          </Card>

          <Button
            onClick={async () => {
              await saveStep("g", {
                colors: { primary: localColors.primary, secondary: localColors.secondary, accent: localColors.accent },
                logo_style: logoStyle,
              });
              setStep("step-h");
            }}
            className="bg-foreground text-background hover:bg-foreground/90 gap-2 w-full"
          >
            <ForwardIcon size={15} /> {t("suite.new.confirmBrand")}
          </Button>
          <button
            onClick={() => setStep("step-h")}
            className="text-muted-foreground text-sm hover:text-foreground w-full text-center"
          >
            {t("suite.new.skipBrand")}
          </button>
        </div>
      )}

      {/* ── Step H: Brand personas ── */}
      {step === "step-h" && (
        <div className="space-y-4">
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>{t("suite.new.stepHTitle")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("suite.new.stepHSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row rounded-2xl border border-border bg-background/60 p-4">
                <Input
                  value={newPersonaName}
                  onChange={(e) => setNewPersonaName(e.target.value)}
                  placeholder={t("suite.new.personaNamePlaceholder")}
                  className="min-h-11 bg-background text-foreground"
                  dir="auto"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const name = newPersonaName.trim();
                    if (!name) return;
                    setPersonas((prev) => prev.some((p) => p.name === name) ? prev : [...prev, { name, role: "", images: [] }]);
                    setNewPersonaName("");
                  }}
                  className="min-h-11 justify-center"
                >
                  {t("suite.new.add")}
                </Button>
              </div>
              {personas.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("suite.new.noPersonas")}</p>
              )}
              <div className="space-y-3">
                {personas.map((persona) => (
                  <div key={persona.name} className="rounded-xl border border-border bg-muted p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium" dir="auto">{persona.name}</p>
                        <p className="text-xs text-muted-foreground">{persona.images.length} {t("suite.new.images")}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs text-[#2f80ff] transition-colors hover:bg-card">
                          <input
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files?.length) await uploadPersonaImages(persona.name, e.target.files);
                              e.currentTarget.value = "";
                            }}
                          />
                          {uploadingAsset ? <Loader2 size={12} className="inline animate-spin" /> : t("suite.new.uploadImages")}
                        </label>
                        <button
                          type="button"
                          onClick={() => setPersonas((prev) => prev.filter((item) => item.name !== persona.name))}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-red-400"
                          aria-label={t("suite.new.removePersona")}
                          title={t("suite.new.removePersona")}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    {persona.images.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {persona.images.map((image) => (
                          <div key={image.url} className="group relative">
                            <img src={image.url} alt={image.name} className="h-20 w-full rounded-lg object-cover" />
                            <button
                              type="button"
                              onClick={() => setPersonas((prev) => prev.map((item) => (
                                item.name === persona.name
                                  ? { ...item, images: item.images.filter((candidate) => candidate.url !== image.url) }
                                  : item
                              )))}
                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-100 shadow-sm transition-colors hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                              aria-label={t("suite.new.removeImage")}
                              title={t("suite.new.removeImage")}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Button
            onClick={async () => {
              await saveStep("h", { brand_personas: personas });
              setStep("strategy");
              await runGenerateStrategy();
            }}
            className="w-full justify-center gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            <ForwardIcon size={15} /> {t("suite.new.buildStrategy2")}
          </Button>
          <button
            onClick={async () => {
              setStep("strategy");
              await runGenerateStrategy();
            }}
            className="text-muted-foreground text-sm hover:text-foreground w-full text-center"
          >
            {t("suite.new.skip")}
          </button>
        </div>
      )}

      {/* ── Step 5: Generating Strategy ── */}
      {step === "strategy" && (
        <div className="text-center py-16 space-y-4">
          {strategyError ? (
            <div className="space-y-4">
              <div className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
                {strategyError}
              </div>
              <Button onClick={runGenerateStrategy} className="bg-foreground text-background hover:bg-foreground/90">
                {t("suite.new.tryAgain")}
              </Button>
            </div>
          ) : (
            <>
              <Loader2 size={44} className="text-[#2f80ff] animate-spin mx-auto" />
              <div>
                <p className="text-foreground font-medium text-lg">{t("suite.new.generatingStrategy")}</p>
                <p className="text-muted-foreground text-sm mt-2">{t("suite.new.strategyWork")}</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground mt-6">
                <span>{t("suite.new.strategyBullet1")}</span>
                <span>{t("suite.new.strategyBullet2")}</span>
                <span>{t("suite.new.strategyBullet3")}</span>
                <span>{t("suite.new.strategyBullet4")}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 6: Strategy Preview ── */}
      {step === "preview" && strategy && (
        <div className="space-y-4">
          <Card className="border-border bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>{t("suite.new.strategyReady")}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("suite.new.strategySaved")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#2f80ff]/10 border border-[#2f80ff]/30 rounded-lg p-4">
                <p className="text-[#2f80ff] text-xs font-medium mb-2 uppercase tracking-wide">{t("suite.new.marketingMessage")}</p>
                <p className="text-foreground text-sm leading-relaxed" dir="auto">{strategy.marketing_message}</p>
              </div>
              {(strategy.marketing_plan?.content_themes ?? []).length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">{t("suite.new.contentThemes")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.marketing_plan.content_themes.map((theme) => (
                      <Badge key={theme} variant="outline" className="border-border text-foreground text-xs">{theme}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button
                onClick={() => { setStep("done"); setTimeout(() => router.push(`/suite/${suiteId}/marketing-plan`), 800); }}
                className="bg-foreground text-background hover:bg-foreground/90 gap-2 w-full"
              >
                <CheckCircle2 size={14} /> {t("suite.new.goToMarketingPlan")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 7: Done ── */}
      {step === "done" && (
        <div className="text-center py-20">
          <CheckCircle2 size={52} className="text-emerald-400 mx-auto mb-4" />
          <p className="text-foreground font-medium text-xl">{t("suite.new.doneTitle")}</p>
          <p className="text-muted-foreground text-sm mt-1">{t("suite.new.doneDesc")}</p>
        </div>
      )}
      </div>
    </div>
  );
}

function TargetAreaCard({
  selected,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-start transition ${
        selected
          ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
          : "border-border hover:border-zinc-500"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected ? "bg-foreground text-background" : "bg-muted text-foreground"}`}>
          {icon}
        </span>
        {selected && <CheckCircle2 size={17} className="shrink-0 text-foreground" />}
      </div>
      <p className="mt-2 text-sm font-bold text-foreground" dir="auto">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground" dir="auto">{description}</p>
    </button>
  );
}

function AudienceChipsSection({
  title,
  addAllLabel,
  addLabel,
  placeholder,
  suggestions,
  selected,
  setSelected,
}: {
  title: string;
  addAllLabel: string;
  addLabel: string;
  placeholder: string;
  suggestions: string[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <p className="text-sm font-bold text-foreground" dir="auto">{title}</p>
        {suggestions.length > 0 && (
          <button
            type="button"
            onClick={() => setSelected((prev) => Array.from(new Set([...prev, ...suggestions])))}
            className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
          >
            {addAllLabel}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 p-4">
        {suggestions.map((item) => (
          <button
            key={item}
            onClick={() => setSelected((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]))}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selected.includes(item)
                ? "bg-foreground border-foreground text-background"
                : "border-border text-muted-foreground hover:border-zinc-500"
            } max-w-full text-start leading-snug`}
            dir="auto"
          >{item}</button>
        ))}
        {selected
          .filter((item) => !suggestions.includes(item))
          .map((item) => (
            <button
              key={item}
              onClick={() => setSelected((prev) => prev.filter((i) => i !== item))}
              className="flex max-w-full items-center gap-1 rounded-full border border-foreground bg-foreground px-3 py-1.5 text-start text-sm leading-snug text-background"
              dir="auto"
            >{item} <X size={11} /></button>
          ))}
      </div>
      <div className="flex flex-col gap-2 border-t border-border bg-muted/20 p-3 sm:flex-row">
        <Input
          placeholder={placeholder}
          className="min-h-11 flex-1 bg-background text-sm text-foreground"
          dir="auto"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.trim()) {
              const val = e.currentTarget.value.trim();
              setSelected((prev) => (prev.includes(val) ? prev : [...prev, val]));
              e.currentTarget.value = "";
              e.preventDefault();
            }
          }}
        />
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-[#2f80ff] hover:bg-muted sm:w-auto"
          onClick={(e) => {
            const input = (e.currentTarget.previousSibling as HTMLInputElement);
            const val = input?.value?.trim();
            if (val) {
              setSelected((prev) => (prev.includes(val) ? prev : [...prev, val]));
              input.value = "";
            }
          }}
        ><Plus size={13} /> {addLabel}</button>
      </div>
    </div>
  );
}
