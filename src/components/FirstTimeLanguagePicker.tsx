"use client";
import { useState, useEffect } from "react";
import { LANGUAGES, LangCode } from "@/lib/i18n/translations";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function FirstTimeLanguagePicker() {
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<LangCode>("en");
  const { setLang, t } = useLanguage();

  useEffect(() => {
    const alreadySet = localStorage.getItem("co_suite_lang_set");
    if (!alreadySet) setShow(true);
  }, []);

  function confirm() {
    setLang(selected);
    localStorage.setItem("co_suite_lang_set", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <h2 className="text-white text-xl font-bold text-center mb-1">{t("langPicker.title")}</h2>
        <p className="text-zinc-400 text-sm text-center mb-6">{t("langPicker.subtitle")}</p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setSelected(l.code as LangCode)}
              dir={l.dir}
              className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                selected === l.code
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40"
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          onClick={confirm}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition-colors"
        >
          {t("langPicker.confirm")}
        </button>
      </div>
    </div>
  );
}
