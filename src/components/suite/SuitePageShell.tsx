"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";

export function SuitePageShell({
  title,
  description,
  backHref,
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  const { dir } = useLanguage();
  const t = useT();
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 md:p-8">
      <header className="flex flex-col gap-2">
        {backHref && (
          <Link href={backHref} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} className={dir === "rtl" ? "rotate-180" : ""} />
            {t("suite.back")}
          </Link>
        )}
        <h1 className="text-2xl font-bold text-foreground" dir="auto">{title}</h1>
        {description && <p className="max-w-3xl text-sm text-muted-foreground" dir="auto">{description}</p>}
      </header>
      {children}
    </div>
  );
}
