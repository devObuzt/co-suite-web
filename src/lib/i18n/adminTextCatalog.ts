import { LangCode, T } from "./translations";

export interface AdminTextCatalogRow {
  key: string;
  source: string;
  sourceLabel: string;
  defaultValue: string;
}

const SOURCE_LABELS: Record<string, string> = {
  nav: "التنقل العام",
  auth: "الدخول والتسجيل",
  landing: "الصفحة الرئيسية",
  "suite.new": "إنشاء السوت",
  "suite.nav": "تنقل السوت",
  "suite.home": "الرئيسية داخل السوت",
  "suite.profile": "العلامة والبروفايل",
  "suite.status": "حالات السوت",
  suite: "السوت",
  langPicker: "اختيار اللغة",
  marketingPlan: "الخطة التسويقية",
};

function sourceForKey(key: string) {
  if (key.startsWith("suite.new.")) return "suite.new";
  if (key.startsWith("suite.nav.")) return "suite.nav";
  if (key.startsWith("suite.home.")) return "suite.home";
  if (key.startsWith("suite.profile.")) return "suite.profile";
  if (key.startsWith("suite.status.")) return "suite.status";
  if (key.startsWith("marketingPlan.")) return "marketingPlan";
  return key.split(".")[0] || "general";
}

export function buildAdminTextCatalog(language: LangCode): AdminTextCatalogRow[] {
  const keys = Array.from(
    new Set([
      ...Object.keys(T.en || {}),
      ...Object.keys(T[language] || {}),
    ])
  ).sort((a, b) => a.localeCompare(b));

  return keys.map((key) => {
    const source = sourceForKey(key);
    return {
      key,
      source,
      sourceLabel: SOURCE_LABELS[source] || source,
      defaultValue: T[language]?.[key] ?? T.en?.[key] ?? key,
    };
  });
}
