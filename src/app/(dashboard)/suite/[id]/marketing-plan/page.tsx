"use client";

import { use } from "react";
import { MarketingPlanStages } from "@/components/marketing-plan/MarketingPlanStages";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const copy = {
  ar: {
    title: "الخطة التسويقية",
    desc: "مراحل واضحة: خدمات، كلمات مفتاحية، منافسين، عرض وطلب.",
  },
  he: {
    title: "התכנית השיווקית",
    desc: "שלבים ברורים: שירותים, מילות מפתח, מתחרים, ביקוש והיצע.",
  },
  en: {
    title: "Marketing Plan",
    desc: "Clear stages: services, keywords, competitors, demand and supply.",
  },
};

export default function MarketingPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLanguage();
  const text = copy[lang as keyof typeof copy] || copy.en;

  return (
    <SuitePageShell title={text.title} description={text.desc}>
      <MarketingPlanStages suiteId={id} />
    </SuitePageShell>
  );
}
