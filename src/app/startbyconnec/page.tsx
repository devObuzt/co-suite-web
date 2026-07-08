"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/LanguageContext";

export default function StartByConnecLanding() {
  const t = useT();
  const benefits = ["benefit1", "benefit2", "benefit3"] as const;
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-10">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t("sbc.hero.title")}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("sbc.hero.subtitle")}</p>
        <Button size="lg" render={<Link href="/startbyconnec/register" />}>
          {t("sbc.hero.cta")}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3 text-start">
        {benefits.map((key) => (
          <div key={key} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-1">{t(`sbc.${key}.title`)}</h3>
            <p className="text-sm text-muted-foreground">{t(`sbc.${key}.body`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
