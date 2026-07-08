"use client";
import { useT } from "@/lib/i18n/LanguageContext";

export default function FunnelDonePage() {
  const t = useT();
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-3">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-bold">{t("sbc.done.title")}</h1>
      <p className="text-muted-foreground">{t("sbc.done.body")}</p>
    </div>
  );
}
