"use client";

import { use } from "react";
import { MarketingPlanStages } from "@/components/marketing-plan/MarketingPlanStages";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const copy = {
  ar: {
    title: "الاستراتيجية",
  },
  he: {
    title: "אסטרטגיה",
  },
  en: {
    title: "Strategy",
  },
};

export default function MarketingPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLanguage();
  const text = copy[lang as keyof typeof copy] || copy.en;

  return (
    <SuitePageShell title={text.title}>
      <MarketingPlanStages suiteId={id} />
    </SuitePageShell>
  );
}
