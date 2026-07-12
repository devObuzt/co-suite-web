"use client";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  CalendarCheck,
  ClipboardList,
  FileSearch,
  Palette,
  Receipt,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useT } from "@/lib/i18n/LanguageContext";

const BENEFITS = [
  { key: "benefit1", icon: Palette, chip: "bg-[#2f80ff]/10 text-[#2f80ff]" },
  { key: "benefit2", icon: CalendarCheck, chip: "bg-[#18b89d]/10 text-[#18b89d]" },
  { key: "benefit3", icon: Receipt, chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
] as const;

const STEPS = [
  { key: "step1", icon: UserPlus },
  { key: "step2", icon: FileSearch },
  { key: "step3", icon: ClipboardList },
  { key: "step4", icon: BadgePercent },
] as const;

function BigCta({ label }: { label: string }) {
  return (
    <Link
      href="/startbyconnec/register"
      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--brand-accent)] to-[var(--brand-accent-strong)] px-8 text-lg font-bold text-white shadow-lg shadow-[#2f80ff]/25 transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
    >
      {label}
      <ArrowRight size={20} className="rtl:-scale-x-100" />
    </Link>
  );
}

export default function StartByConnecLanding() {
  const t = useT();
  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 py-12 md:space-y-24 md:py-20">
      <section className="space-y-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2f80ff]/20 bg-[#2f80ff]/10 px-3.5 py-1.5 text-sm font-semibold text-[var(--brand-accent)]">
          <Sparkles size={14} />
          {t("sbc.hero.badge")}
        </span>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          {t("sbc.hero.titleMain")}{" "}
          <span className="bg-gradient-to-r from-[var(--brand-accent)] to-[var(--brand-mint)] bg-clip-text text-transparent">
            {t("sbc.hero.titleAccent")}
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t("sbc.hero.subtitle")}</p>
        <div className="space-y-3 pt-2">
          <BigCta label={t("sbc.hero.cta")} />
          <p className="text-sm text-muted-foreground">{t("sbc.hero.trust")}</p>
        </div>
      </section>

      <section className="grid gap-4 text-start md:grid-cols-3">
        {BENEFITS.map(({ key, icon: Icon, chip }) => (
          <div
            key={key}
            className="rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${chip}`}>
              <Icon size={22} />
            </span>
            <h3 className="mb-1.5 font-bold">{t(`sbc.${key}.title`)}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{t(`sbc.${key}.body`)}</p>
          </div>
        ))}
      </section>

      <section className="space-y-8">
        <h2 className="text-center text-2xl font-extrabold tracking-tight md:text-3xl">
          {t("sbc.how.title")}
        </h2>
        <ol className="grid gap-6 md:grid-cols-4">
          {STEPS.map(({ key, icon: Icon }, i) => (
            <li key={key} className="flex gap-4 text-start md:flex-col md:gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-accent)] to-[var(--brand-mint)] font-bold text-white shadow-md">
                {i + 1}
              </span>
              <div>
                <h3 className="mb-1 flex items-center gap-1.5 font-bold">
                  <Icon size={15} className="text-[var(--brand-accent)]" />
                  {t(`sbc.how.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`sbc.how.${key}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-3xl border border-border bg-gradient-to-br from-[#2f80ff]/10 via-transparent to-[#18b89d]/10 px-6 py-12 text-center md:py-16">
        <h2 className="mb-2 text-2xl font-extrabold tracking-tight md:text-3xl">{t("sbc.cta.title")}</h2>
        <p className="mb-6 text-muted-foreground">{t("sbc.cta.body")}</p>
        <BigCta label={t("sbc.hero.cta")} />
      </section>
    </div>
  );
}
