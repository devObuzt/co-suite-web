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
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full"
      >
        <Globe size={14} />
        <span>{current?.label ?? "English"}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-44 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden z-20">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              dir={l.dir}
              onClick={() => { setLang(l.code as LangCode); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                lang === l.code
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
