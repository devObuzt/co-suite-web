"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { T, LANGUAGES, LangCode } from "./translations";
import { api } from "@/lib/api";

interface LanguageCtx {
  lang: LangCode;
  dir: "ltr" | "rtl";
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageCtx>({
  lang: "en",
  dir: "ltr",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = (localStorage.getItem("co_suite_lang") || "en") as LangCode;
    applyLang(saved);
  }, []);

  function applyLang(l: LangCode) {
    const found = LANGUAGES.find((x) => x.code === l);
    const dir = found?.dir ?? "ltr";
    setLangState(l);
    localStorage.setItem("co_suite_lang", l);
    document.documentElement.lang = l;
    document.documentElement.dir = dir;
  }

  useEffect(() => {
    let canceled = false;
    api.appText
      .get(lang)
      .then((res) => {
        if (!canceled) setOverrides(res.overrides || {});
      })
      .catch(() => {
        if (!canceled) setOverrides({});
      });
    return () => {
      canceled = true;
    };
  }, [lang]);

  const t = useCallback(
    (key: string) => overrides[key] ?? T[lang]?.[key] ?? T["en"]?.[key] ?? key,
    [lang, overrides]
  );

  const dir = (LANGUAGES.find((x) => x.code === lang)?.dir ?? "ltr") as "ltr" | "rtl";

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang: applyLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
export const useT = () => useContext(LanguageContext).t;
