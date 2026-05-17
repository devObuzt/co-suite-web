"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { T, LANGUAGES, LangCode } from "./translations";

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

  const t = useCallback(
    (key: string) => T[lang]?.[key] ?? T["en"]?.[key] ?? key,
    [lang]
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
