
"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Copy, Eye, FileDown, Loader2, RefreshCw, Share2 } from "lucide-react";
import { api, GenerateContentRequest, GenerationStatus, MarketingPlanDeck } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketingPlanView } from "@/components/marketing-plan/MarketingPlanView";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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
  },
};

export default function MarketingPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, dir } = useLanguage();
  const text = copy[lang as keyof typeof copy] || copy.en;
  const [deck, setDeck] = useState<MarketingPlanDeck | null>(null);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.marketingPlans.get(id);
      setDeck(res.deck);
      if (res.deck?.share?.token && typeof window !== "undefined") {
        setShareUrl(`${window.location.origin}/marketing-plans/share/${res.deck.share.token}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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
      if (res.deck?.share?.token && typeof window !== "undefined") {
        setShareUrl(`${window.location.origin}/marketing-plans/share/${res.deck.share.token}`);
      }
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
          <Button onClick={generate} disabled={generating} className="gap-2">
            {generating ? <Loader2 size={16} className="animate-spin" /> : deck ? <RefreshCw size={16} /> : <FileDown size={16} />}
            {generating ? text.generating : deck ? text.regenerate : text.generate}
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
        <MarketingPlanView deck={deck} onGenerateItem={generatePlanItem} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <FileDown size={34} className="mx-auto text-muted-foreground" />
          <h2 className="mt-3 text-xl font-bold text-foreground">{text.missingTitle}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">{text.missingDesc}</p>
          <Button onClick={generate} disabled={generating} className="mt-5 gap-2">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {generating ? text.generating : text.generate}
          </Button>
        </div>
      )}
    </SuitePageShell>
  );
}
