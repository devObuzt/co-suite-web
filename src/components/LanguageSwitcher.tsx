"use client";
import { useState } from "react";
import { Globe } from "lucide-react";
import { LANGUAGES, LangCode } from "@/lib/i18n/translations";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors w-full"
      >
        <Globe size={14} />
        <span>{current?.label ?? "English"}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-44 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-20">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              dir={l.dir}
              onClick={() => { setLang(l.code as LangCode); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                lang === l.code
                  ? "bg-indigo-950 text-indigo-300"
                  : "text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
