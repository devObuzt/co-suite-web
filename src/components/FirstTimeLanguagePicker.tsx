"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { LANGUAGES, LangCode } from "@/lib/i18n/translations";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ThemeMode, useTheme } from "@/lib/accessibility/AccessibilityContext";
import { BrandMark } from "@/components/BrandMark";

const PRIMARY_LANGUAGE_CODES: LangCode[] = ["en", "he", "ar"];

type Step = "lang" | "theme";

function ThemePreviewCard({
  mode,
  label,
  selected,
  onSelect,
}: {
  mode: ThemeMode;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-2xl border-2 p-2 text-start transition-all ${
        selected
          ? "border-[var(--brand-accent)] shadow-lg"
          : "border-border hover:border-muted-foreground/40"
      }`}
    >
      <div
        className={`overflow-hidden rounded-xl border ${
          isDark ? "border-zinc-700 bg-zinc-950" : "border-zinc-200 bg-white"
        }`}
      >
        <div
          className={`flex items-center gap-1.5 border-b px-2.5 py-2 ${
            isDark ? "border-zinc-800" : "border-zinc-100"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-[var(--brand-accent)]" />
          <span className={`h-1.5 w-9 rounded-full ${isDark ? "bg-zinc-700" : "bg-zinc-200"}`} />
        </div>
        <div className="space-y-1.5 p-2.5">
          <span className={`block h-2 w-3/4 rounded-full ${isDark ? "bg-zinc-600" : "bg-zinc-300"}`} />
          <span className={`block h-1.5 w-full rounded-full ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`} />
          <span className={`block h-1.5 w-5/6 rounded-full ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`} />
          <span className="mt-1 block h-3.5 w-1/2 rounded-md bg-[var(--brand-accent)]" />
        </div>
      </div>
      <span className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground">
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
        {label}
      </span>
    </button>
  );
}

export function FirstTimeLanguagePicker() {
  const [step, setStep] = useState<Step | null>(null);
  const [twoSteps, setTwoSteps] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { setLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/" || step !== null) return;
    const langSet = localStorage.getItem("co_suite_lang_set");
    const themeSet =
      localStorage.getItem("oneshare_a11y_prefs") || localStorage.getItem("co_suite_theme");
    if (!langSet) {
      setTwoSteps(true);
      setStep("lang");
    } else if (!themeSet) {
      setStep("theme");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function chooseLanguage(code: LangCode) {
    setLang(code);
    localStorage.setItem("co_suite_lang_set", "1");
    setStep("theme");
  }

  function confirmTheme() {
    setTheme(theme); // persist current selection even if untouched
    setStep(null);
  }

  if (!step) return null;

  const primaryLanguages = PRIMARY_LANGUAGE_CODES.map((code) =>
    LANGUAGES.find((l) => l.code === code)
  ).filter(Boolean) as typeof LANGUAGES;
  const moreLanguages = LANGUAGES.filter(
    (l) => !PRIMARY_LANGUAGE_CODES.includes(l.code as LangCode)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/90 px-5 py-8 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-4">
          <BrandMark size="md" />
          {twoSteps && (
            <div className="flex items-center gap-1.5" aria-hidden>
              <span
                className={`h-1.5 rounded-full transition-all ${
                  step === "lang" ? "w-6 bg-[var(--brand-accent)]" : "w-1.5 bg-border"
                }`}
              />
              <span
                className={`h-1.5 rounded-full transition-all ${
                  step === "theme" ? "w-6 bg-[var(--brand-accent)]" : "w-1.5 bg-border"
                }`}
              />
            </div>
          )}
        </div>

        {step === "lang" ? (
          <>
            <div className="mb-6 space-y-1.5 text-center">
              <p className="text-xl font-bold text-foreground" dir="ltr">
                How should we speak with you?
              </p>
              <p className="text-xl font-bold text-foreground" dir="rtl">
                איך תרצה שנדבר איתך?
              </p>
              <p className="text-xl font-bold text-foreground" dir="rtl">
                كيف تحب نحكي معك؟
              </p>
              <p className="pt-2 text-sm text-muted-foreground">{t("langPicker.subtitle")}</p>
            </div>

            <div className="grid gap-3">
              {primaryLanguages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => chooseLanguage(l.code as LangCode)}
                  dir={l.dir}
                  className="rounded-xl border border-border bg-background px-5 py-4 text-base font-semibold text-foreground transition-colors hover:border-[var(--brand-accent)] hover:bg-accent focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                >
                  {l.label}
                </button>
              ))}
            </div>

            {showMore && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {moreLanguages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => chooseLanguage(l.code as LangCode)}
                    dir={l.dir}
                    className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-[var(--brand-accent)] hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="mx-auto mt-5 block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {showMore ? t("langPicker.less") : t("langPicker.more")}
            </button>
          </>
        ) : (
          <>
            <div className="mb-6 space-y-1.5 text-center">
              <p className="text-xl font-bold text-foreground">{t("themePicker.title")}</p>
              <p className="text-sm text-muted-foreground">{t("themePicker.subtitle")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ThemePreviewCard
                mode="light"
                label={t("themePicker.light")}
                selected={theme === "light"}
                onSelect={() => setTheme("light")}
              />
              <ThemePreviewCard
                mode="dark"
                label={t("themePicker.dark")}
                selected={theme === "dark"}
                onSelect={() => setTheme("dark")}
              />
            </div>

            <button
              type="button"
              onClick={confirmTheme}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[var(--brand-accent)] to-[var(--brand-accent-strong)] px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-[#2f80ff]/25 transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {t("themePicker.confirm")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
