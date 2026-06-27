"use client";

import { use } from "react";
import { MarketingPlanStages } from "@/components/marketing-plan/MarketingPlanStages";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type StageSlug = "services" | "keywords" | "competitors" | "demand-supply" | "personas";

const stageTitles = {
  ar: {
    services: "الخدمات / المنتجات",
    keywords: "الكلمات المفتاحية",
    competitors: "المنافسون",
    "demand-supply": "العرض والطلب",
    personas: "شخصيات العملاء",
  },
  he: {
    services: "שירותים / מוצרים",
    keywords: "מילות מפתח",
    competitors: "מתחרים",
    "demand-supply": "ביקוש והיצע",
    personas: "פרסונות לקוחות",
  },
  en: {
    services: "Services / Products",
    keywords: "Keywords",
    competitors: "Competitors",
    "demand-supply": "Demand and Supply",
    personas: "Customer Personas",
  },
};

function normalizeStage(value: string): StageSlug {
  if (value === "services" || value === "keywords" || value === "competitors" || value === "demand-supply" || value === "personas") {
    return value;
  }
  return "services";
}

export default function MarketingPlanStagePage({ params }: { params: Promise<{ id: string; stage: string }> }) {
  const { id, stage } = use(params);
  const { lang } = useLanguage();
  const slug = normalizeStage(stage);
  const titleMap = stageTitles[lang as keyof typeof stageTitles] || stageTitles.en;

  return (
    <SuitePageShell title={titleMap[slug]} description="">
      <MarketingPlanStages suiteId={id} stage={slug} />
    </SuitePageShell>
  );
}
