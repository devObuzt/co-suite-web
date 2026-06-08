"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { LANGUAGES, LangCode } from "@/lib/i18n/translations";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const PRIMARY_LANGUAGE_CODES: LangCode[] = ["en", "he", "ar"];

export function FirstTimeLanguagePicker() {
  const [show, setShow] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { setLang, t } = useLanguage();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/") return;
    const alreadySet = localStorage.getItem("co_suite_lang_set");
    if (!alreadySet) setShow(true);
  }, [pathname]);

  function chooseLanguage(code: LangCode) {
    setLang(code);
    localStorage.setItem("co_suite_lang_set", "1");
    setShow(false);
  }

  if (!show) return null;

  const primaryLanguages = PRIMARY_LANGUAGE_CODES
    .map((code) => LANGUAGES.find((l) => l.code === code))
    .filter(Boolean) as typeof LANGUAGES;
  const moreLanguages = LANGUAGES.filter(
    (l) => !PRIMARY_LANGUAGE_CODES.includes(l.code as LangCode)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-2xl font-semibold tracking-normal text-white">How should we speak with you?</p>
          <p className="text-2xl font-semibold tracking-normal text-white" dir="rtl">איך תרצה שנדבר איתך?</p>
          <p className="text-2xl font-semibold tracking-normal text-white" dir="rtl">كيف تحب نحكي معك؟</p>
          <p className="pt-3 text-sm text-zinc-400">{t("langPicker.subtitle")}</p>
        </div>

        <div className="grid gap-3">
          {primaryLanguages.map((l) => (
            <button
              key={l.code}
              onClick={() => chooseLanguage(l.code as LangCode)}
              dir={l.dir}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-4 text-base font-semibold text-white transition-colors hover:border-indigo-500 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="mx-auto mt-5 block rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
        >
          {showMore ? t("langPicker.less") : t("langPicker.more")}
        </button>
      </div>
    </div>
  );
}
