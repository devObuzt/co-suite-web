"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type React from "react";
import { ArrowRight, BarChart3, CalendarClock, ImageIcon, Layers, Loader2, Sparkles, Video, Wand2 } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, GenerateContentRequest, GenerationStatus } from "@/lib/api";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";
import { useAuthStore } from "@/store/auth";

type CreateChoice = {
  key: "quick" | "image" | "video" | "carousel";
  content_type: GenerateContentRequest["content_type"];
  mode: GenerateContentRequest["mode"];
  icon: React.ReactNode;
  accent: string;
};

const choices: CreateChoice[] = [
  {
    key: "quick",
    content_type: "mixed",
    mode: "quick",
    icon: <Sparkles size={17} />,
    accent: "from-[#f8d84a]/30 to-[#ff4fa3]/20",
  },
  {
    key: "image",
    content_type: "image",
    mode: "image",
    icon: <ImageIcon size={17} />,
    accent: "from-[#2f80ff]/25 to-[#35d6b5]/15",
  },
  {
    key: "video",
    content_type: "video",
    mode: "video",
    icon: <Video size={17} />,
    accent: "from-[#ff4fa3]/25 to-[#f8d84a]/15",
  },
  {
    key: "carousel",
    content_type: "carousel",
    mode: "carousel",
    icon: <Layers size={17} />,
    accent: "from-[#35d6b5]/25 to-[#2f80ff]/15",
  },
];

function generationCountForChoice(choice: CreateChoice) {
  return choice.mode === "quick" && choice.content_type === "mixed" ? 3 : 1;
}

export default function LandingPage() {
  const router = useRouter();
  const t = useT();
  const { lang, dir } = useLanguage();
  const { token, _hasHydrated } = useAuthStore();
  const [prompt, setPrompt] = useState("");
  const [choice, setChoice] = useState<CreateChoice>(choices[0]);
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [error, setError] = useState("");
  const [showAuthGate, setShowAuthGate] = useState(false);

  const isLoggedIn = Boolean(_hasHydrated && token);
  const isBusy = status?.status === "queued" || status?.status === "running" || status?.status === "retrying";

  const copy = useMemo(() => {
    if (lang === "ar") {
      return {
        badge: "محرك إنشاء OneShare",
        title: "ابدأ من الشيء الذي تريد توليده.",
        subtitle: "اكتب الطلب أولاً. OneShare يحوله إلى منشور، صورة، فيديو، كاروسيل، مسودة حملة، أو سير عمل كامل بعد تسجيل الدخول.",
        promptTitle: "ماذا نصنع لك؟",
        promptKicker: "إنشاء وتوليد",
        placeholder: "مثال: اعمل حملة صغيرة لمحل أطفال، صورة + كابشن، بلغة محلية وواضحة...",
        emptyPrompt: "اكتب شو بدك نولد أولًا.",
        signInTitle: "سجل دخولك لبدء التوليد.",
        signInText: "طلبك جاهز. افتح حساب أو سجل دخولك ثم كمل من مساحة الإنشاء.",
        createAccount: "افتح حساب",
        signIn: "تسجيل الدخول",
        generate: "ولّد الآن",
        generating: "جاري التوليد...",
        workspace: "افتح مساحة الإنشاء",
        chips: ["Brand mode بعد فتح سوت", "موديل تلقائي", "توليد يدعم الانتظار"],
        signals: [
          ["أنشئ", "صور، فيديوهات، كاروسيلات، وكابشنز."],
          ["قِس", "Meta، Google، صفحات، وحملات."],
          ["شغّل", "جدولة، loops، موافقات."],
        ],
        choices: {
          quick: ["Quick post/ad", "مسودة عملية للسوشيال أو الإعلانات."],
          image: ["صورة", "اتجاه بصري واحد من طلبك."],
          video: ["فيديو", "فكرة فيديو قصيرة للمراجعة."],
          carousel: ["كاروسيل", "سلايدات للتعليم، البيع، أو الشرح."],
        },
      };
    }
    if (lang === "he") {
      return {
        badge: "מנוע היצירה של OneShare",
        title: "מתחילים ממה שצריך ליצור.",
        subtitle: "כתבו את הבקשה קודם. OneShare יכול להפוך אותה לפוסט, תמונה, וידאו, קרוסלה, טיוטת קמפיין או תהליך עבודה מלא אחרי התחברות.",
        promptTitle: "מה ליצור עבורך?",
        promptKicker: "Create & generate",
        placeholder: "לדוגמה: צור קמפיין קטן לחנות תינוקות, תמונה וכיתוב, בשפה מקומית וברורה...",
        emptyPrompt: "כתוב קודם מה תרצה שניצור.",
        signInTitle: "צריך להתחבר כדי להתחיל יצירה.",
        signInText: "הבקשה שלך מוכנה. צור חשבון או התחבר ואז המשך מאזור היצירה.",
        createAccount: "יצירת חשבון",
        signIn: "התחברות",
        generate: "צור עכשיו",
        generating: "יוצר...",
        workspace: "פתח את אזור היצירה",
        chips: ["Brand mode אחרי הקמת Suite", "מודל אוטומטי", "תור יצירה מנוהל"],
        signals: [
          ["Create", "תמונות, וידאו, קרוסלות וכיתובים."],
          ["Measure", "Meta, Google, עמודים וקמפיינים."],
          ["Run", "תזמון, לופים ואישורים."],
        ],
        choices: {
          quick: ["Quick post/ad", "טיוטה ראשונה לסושיאל או מודעות."],
          image: ["תמונה", "כיוון ויזואלי אחד מתוך הבקשה."],
          video: ["וידאו", "קונספט קצר לבדיקה."],
          carousel: ["קרוסלה", "שקופיות ללימוד, מכירה או הסבר."],
        },
      };
    }
    return {
      badge: "OneShare creation engine",
      title: "Start with the thing you need to create.",
      subtitle: "Write the request first. OneShare can turn it into a post, image, video, carousel, campaign draft, or a full business workflow after you sign in.",
      promptTitle: "What should we make?",
      promptKicker: "Create & generate",
      placeholder: "Example: create a small campaign for a baby store, image plus caption, clear local language...",
      emptyPrompt: "Write what you want to create first.",
      signInTitle: "Sign in to start generation.",
      signInText: "Your prompt is ready. Create an account or sign in, then continue from the creation workspace.",
      createAccount: "Create account",
      signIn: "Sign in",
      generate: "Generate now",
      generating: "Generating...",
      workspace: "Open creation workspace",
      chips: ["Brand mode after Suite setup", "Auto model", "Queue-aware generation"],
      signals: [
        ["Create", "Images, videos, carousels, captions."],
        ["Measure", "Meta, Google, pages, campaigns."],
        ["Run", "Scheduling, loops, approvals."],
      ],
      choices: {
        quick: ["Quick post/ad", "A practical first draft for social or ads."],
        image: ["Create image", "One visual direction from your prompt."],
        video: ["Create video", "A short video concept ready for review."],
        carousel: ["Carousel", "Slides for teaching, selling, or explaining."],
      },
    };
  }, [lang]);

  async function handleGenerate() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setError(copy.emptyPrompt);
      return;
    }

    if (!isLoggedIn) {
      setError("");
      setShowAuthGate(true);
      return;
    }

    setError("");
    setShowAuthGate(false);
    try {
      const next = await api.content.generateAccount({
        count: generationCountForChoice(choice),
        prompt: cleanPrompt,
        mode: choice.mode,
        content_type: choice.content_type,
        destination: "social",
        aspect_ratio: "Auto",
        model_tier: "auto",
        use_brand: false,
        language: lang,
      });
      setStatus(next);
      router.push("/create");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_10%,rgba(248,216,74,0.18),transparent_28%),radial-gradient(circle_at_88%_20%,rgba(47,128,255,0.13),transparent_30%),linear-gradient(180deg,var(--background),var(--background))] text-foreground dark:bg-[radial-gradient(circle_at_12%_10%,rgba(248,216,74,0.08),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(47,128,255,0.1),transparent_34%),linear-gradient(180deg,var(--background),var(--background))]" dir={dir}>
      <nav className="sticky top-0 z-30 border-b border-border bg-background/84 px-4 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <BrandMark />
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <ThemeSwitcher compact />
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t("auth.signIn")}
              </Button>
            </Link>
            <Link href="/signup">
              <Button>{t("landing.getStarted")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-8 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-8">
          <div className="space-y-5">
            <Badge variant="outline" className="border-[#f8d84a]/50 bg-[#f8d84a]/10 text-foreground">
              <Sparkles size={14} />
              {copy.badge}
            </Badge>
            <div className="max-w-3xl space-y-5">
              <h1 className="text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
                {copy.title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SignalCard icon={<ImageIcon size={18} />} title={copy.signals[0][0]} text={copy.signals[0][1]} accent="bg-[#f8d84a]" />
            <SignalCard icon={<BarChart3 size={18} />} title={copy.signals[1][0]} text={copy.signals[1][1]} accent="bg-[#2f80ff]" />
            <SignalCard icon={<CalendarClock size={18} />} title={copy.signals[2][0]} text={copy.signals[2][1]} accent="bg-[#ff4fa3]" />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border bg-card/88 p-2.5 shadow-[0_28px_90px_rgba(0,0,0,0.12)] backdrop-blur dark:shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:p-3">
          <div className="rounded-[1.35rem] border border-border/70 bg-background/92 p-3 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{copy.promptKicker}</p>
                <h2 className="text-xl font-semibold tracking-normal">{copy.promptTitle}</h2>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_35px_rgba(248,216,74,0.18)]">
                <Wand2 size={20} />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {choices.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setChoice(item)}
                  className={`relative min-h-20 overflow-hidden rounded-xl border p-3 text-start transition sm:min-h-24 ${
                    choice.key === item.key
                      ? "border-primary/70 bg-primary text-primary-foreground shadow-[0_12px_32px_rgba(0,0,0,0.13)]"
                      : "border-border bg-card/88 hover:border-foreground/20 hover:bg-accent"
                  }`}
                >
                  <span className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent}`} />
                  <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold sm:mb-3">
                    {item.icon}
                    {copy.choices[item.key][0]}
                  </span>
                  <span className={`block text-xs leading-5 ${choice.key === item.key ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                    {copy.choices[item.key][1]}
                  </span>
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={copy.placeholder}
              className="mt-3 min-h-36 w-full resize-y rounded-2xl border border-input bg-background/95 px-4 py-4 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/20 sm:mt-4 sm:min-h-44"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {copy.chips.map((chip) => (
                <span key={chip} className="rounded-full border border-border px-3 py-1">{chip}</span>
              ))}
            </div>

            {showAuthGate && (
              <div className="mt-4 rounded-2xl border border-[#2f80ff]/40 bg-[#2f80ff]/10 p-4">
                <p className="text-sm font-medium text-foreground">{copy.signInTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {copy.signInText}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link href="/signup">
                    <Button className="w-full gap-2 sm:w-auto">
                      {copy.createAccount}
                      <ArrowRight size={15} />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" className="w-full sm:w-auto">
                      {copy.signIn}
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {status?.message && (
              <div className="mt-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {status.message}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={handleGenerate} disabled={isBusy} size="lg" className="gap-2">
                {isBusy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                {isBusy ? copy.generating : copy.generate}
              </Button>
              <Link href="/create" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                {copy.workspace}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} OneShare. AI marketing tools for business teams.
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/legal/accessibility" className="hover:text-foreground">Accessibility</Link>
            <Link href="/legal/billing" className="hover:text-foreground">Billing</Link>
            <Link href="/legal/ai-policy" className="hover:text-foreground">AI Policy</Link>
            <Link href="/legal/cookies" className="hover:text-foreground">Cookies</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function SignalCard({ icon, title, text, accent }: { icon: React.ReactNode; title: string; text: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`mb-4 h-1.5 w-12 rounded-full ${accent}`} />
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
