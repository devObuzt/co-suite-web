"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";
import { BarChart3, CalendarClock, ImagePlus, Sparkles } from "lucide-react";

export default function LandingPage() {
  const t = useT();
  const { dir } = useLanguage();
  const features = [
    { icon: <ImagePlus size={18} />, title: t("landing.featureContentTitle"), desc: t("landing.featureContentDesc") },
    { icon: <BarChart3 size={18} />, title: t("landing.featureAdsTitle"), desc: t("landing.featureAdsDesc") },
    { icon: <CalendarClock size={18} />, title: t("landing.featureScheduleTitle"), desc: t("landing.featureScheduleDesc") },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col" dir={dir}>
      {/* Nav */}
      <nav className="flex items-center justify-between gap-3 px-4 py-4 border-b border-border sm:px-8">
        <BrandMark />
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block"><LanguageSwitcher /></div>
          <ThemeSwitcher compact />
          <Link href="/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">{t("auth.signIn")}</Button>
          </Link>
          <Link href="/signup">
            <Button>{t("landing.getStarted")}</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 sm:py-24">
        <div className="inline-flex items-center gap-2 bg-card border border-border text-muted-foreground text-sm px-3 py-1 rounded-full mb-8">
          <Sparkles size={14} className="text-indigo-400" />
          {t("landing.badge")}
        </div>

        <h1 className="text-4xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.1] mb-6">
          {t("landing.title")}
          <span className="text-indigo-400"> {t("landing.titleAccent")}</span>
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          {t("landing.subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/signup">
            <Button size="lg" className="px-8 h-12 text-base">
              {t("landing.startFree")}
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="px-8 h-12 text-base">
              {t("auth.signIn")}
            </Button>
          </Link>
        </div>
        <div className="mt-6 sm:hidden"><LanguageSwitcher /></div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-border grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {features.map((f) => (
          <div key={f.title} className="p-8">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-indigo-400">
              {f.icon}
            </div>
            <h3 className="text-foreground font-semibold mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
