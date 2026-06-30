"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  ClipboardList,
  Database,
  FileClock,
  GalleryHorizontalEnd,
  Layers3,
  Link2,
  PackageOpen,
  Receipt,
  Settings,
  Sparkles,
  UserRound,
  UserSquare2,
  WandSparkles,
} from "lucide-react";
import { api, Connections, StorageStatus, Suite } from "@/lib/api";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";

const copy = {
  ar: {
    description: "مساحة السوت الرئيسية مقسمة حسب طريقة العمل: استراتيجية، إنشاء، بيانات، وتشابكات.",
    statusReady: "جاهز",
    statusNeedsSetup: "يحتاج إعداد",
    soon: "قريبًا",
    open: "فتح",
    strategy: {
      title: "الاستراتيجية",
      eyebrow: "العقل والخطة",
      desc: "كل ما يحدد اتجاه السوت: البراند، الخطة التسويقية، خطط العمل، وسجل ما تغيّر.",
      links: {
        brand: "العلامة التجارية والبراند",
        plan: "الخطة التسويقية",
        workPlans: "خطط العمل المولدة",
        logs: "اللوجز",
      },
    },
    creation: {
      title: "التوليد والإنشاء",
      eyebrow: "إنتاج المحتوى",
      desc: "منطقة توليد المنشورات، الملفات، المنتجات، الحملات، وجدولة العمل اليومي.",
      links: {
        create: "إنشاء جديد",
        content: "مكتبة المحتوى",
        productBulk: "توليد المنتجات",
        videoMontage: "مونتاج الفيديوهات",
        calendar: "التقويم",
        campaigns: "الحملات",
        analytics: "التحليلات",
      },
    },
    data: {
      title: "מאגר מידע",
      eyebrow: "البيانات والعلاقات",
      desc: "المكان القادم لليدز، الزباين، الشرائح، ومصادر البيانات التي تغذي العمل.",
      links: {
        leads: "Leads",
        customers: "Customers",
        market: "قراءة السوق",
      },
    },
    settings: {
      title: "الإعدادات والتشابكات",
      eyebrow: "الربط والتشغيل",
      desc: "الحسابات المربوطة، الفوترة، التخزين، وإعدادات تشغيل السوت.",
      links: {
        connections: "التشابكات",
        billing: "الفوترة",
        storage: "التخزين",
        settings: "الإعدادات",
      },
    },
  },
  he: {
    description: "דף הבית של הסוויט מחולק לפי עבודה: אסטרטגיה, יצירה, מידע וחיבורים.",
    statusReady: "מוכן",
    statusNeedsSetup: "דורש הגדרה",
    soon: "בקרוב",
    open: "פתח",
    strategy: {
      title: "אסטרטגיה",
      eyebrow: "המוח והתכנית",
      desc: "כל מה שמגדיר את כיוון הסוויט: מותג, תכנית שיווקית, תכניות עבודה ולוגים.",
      links: {
        brand: "מותג וברנד",
        plan: "תכנית שיווקית",
        workPlans: "תכניות עבודה שנוצרו",
        logs: "לוגים",
      },
    },
    creation: {
      title: "יצירה והפקה",
      eyebrow: "ייצור תוכן",
      desc: "יצירת פוסטים, קבצים, מוצרים, קמפיינים ותכנון יומי.",
      links: {
        create: "יצירה חדשה",
        content: "ספריית תוכן",
        productBulk: "יצירת מוצרים",
        videoMontage: "עריכת וידאו",
        calendar: "לוח שנה",
        campaigns: "קמפיינים",
        analytics: "אנליטיקה",
      },
    },
    data: {
      title: "מאגר מידע",
      eyebrow: "נתונים וקשרים",
      desc: "המקום הבא ללידים, לקוחות, סגמנטים ומקורות מידע.",
      links: {
        leads: "לידים",
        customers: "לקוחות",
        market: "מחקר שוק",
      },
    },
    settings: {
      title: "הגדרות וחיבורים",
      eyebrow: "חיבור ותפעול",
      desc: "חשבונות מחוברים, חיוב, אחסון והגדרות תפעול.",
      links: {
        connections: "חיבורים",
        billing: "חיוב",
        storage: "אחסון",
        settings: "הגדרות",
      },
    },
  },
  en: {
    description: "The Suite home is organized by workflow: strategy, creation, data, and connections.",
    statusReady: "Ready",
    statusNeedsSetup: "Needs setup",
    soon: "Soon",
    open: "Open",
    strategy: {
      title: "Strategy",
      eyebrow: "Mind and plan",
      desc: "Everything that defines the Suite direction: brand, marketing plan, generated work plans, and logs.",
      links: {
        brand: "Brand profile",
        plan: "Marketing plan",
        workPlans: "Generated work plans",
        logs: "Logs",
      },
    },
    creation: {
      title: "Generation and Creation",
      eyebrow: "Content production",
      desc: "Create posts, assets, products, campaigns, and day-to-day execution work.",
      links: {
        create: "Create new",
        content: "Content library",
        productBulk: "Product generation",
        videoMontage: "Video montage",
        calendar: "Calendar",
        campaigns: "Campaigns",
        analytics: "Analytics",
      },
    },
    data: {
      title: "מאגר מידע",
      eyebrow: "Data and relationships",
      desc: "The future home for leads, customers, segments, and data sources.",
      links: {
        leads: "Leads",
        customers: "Customers",
        market: "Market intelligence",
      },
    },
    settings: {
      title: "Settings and Connections",
      eyebrow: "Connect and operate",
      desc: "Connected accounts, billing, storage, and operational setup.",
      links: {
        connections: "Connections",
        billing: "Billing",
        storage: "Storage",
        settings: "Settings",
      },
    },
  },
};

type SectionLink = {
  label: string;
  href?: string;
  icon: React.ReactNode;
  status?: "ready" | "needs_setup" | "soon";
};

function hasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasProductsOrServices(suite: Suite | null): boolean {
  return hasItems(suite?.brand?.services) || hasItems(suite?.brand?.products);
}

function isMarketingPlanReady(suite: Suite | null): boolean {
  const strategy = suite?.strategy as Record<string, unknown> | null | undefined;
  const intelligence = strategy?.marketing_intelligence as Record<string, unknown> | null | undefined;
  const demandSupply = intelligence?.demand_supply as Record<string, unknown> | null | undefined;

  return Boolean(
    hasProductsOrServices(suite)
    && hasItems(intelligence?.keywords)
    && hasItems(intelligence?.competitors)
    && hasItems(intelligence?.personas)
    && demandSupply
    && (hasItems(demandSupply.keyword_metrics) || hasItems(demandSupply.suggested_keywords) || demandSupply.summary)
  );
}

function isGeneratedWorkPlanReady(suite: Suite | null): boolean {
  const strategy = suite?.strategy as Record<string, unknown> | null | undefined;
  const actionPlan = strategy?.marketing_action_plan as Record<string, unknown> | null | undefined;

  return Boolean(
    actionPlan
    && (
      hasItems(actionPlan.social_items)
      || hasItems(actionPlan.ad_funnel_items)
      || hasItems((actionPlan.social_content_plan as Record<string, unknown> | undefined)?.selected_ids)
      || hasItems((actionPlan.paid_content_plan as Record<string, unknown> | undefined)?.selected_ids)
    )
  );
}

export default function SuiteHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const { lang } = useLanguage();
  const text = copy[lang as keyof typeof copy] || copy.en;
  const [suite, setSuite] = useState<Suite | null>(null);
  const [connections, setConnections] = useState<Connections>({});
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.suites.get(id).then(setSuite),
      api.connections.get(id).then(setConnections).catch(() => setConnections({})),
      api.suites.storageStatus(id).then(setStorage).catch(() => setStorage(null)),
    ]).finally(() => setLoading(false));
  }, [id]);

  const sections = useMemo(() => {
    const brandReady = Boolean(suite?.brand?.name && ((suite.brand?.services || []).length > 0 || (suite.brand?.products || []).length > 0));
    const planReady = isMarketingPlanReady(suite);
    const workPlansReady = isGeneratedWorkPlanReady(suite);
    const metaReady = Boolean(connections.facebook?.connected || connections.instagram?.connected);
    const googleReady = Boolean(connections.google_ads?.connected);
    const storageReady = Boolean(storage?.configured);

    return [
      {
        id: "strategy",
        title: text.strategy.title,
        eyebrow: text.strategy.eyebrow,
        desc: text.strategy.desc,
        icon: <Layers3 size={24} />,
        accent: "from-[#2f80ff]/18 via-[#18b89d]/10 to-transparent",
        iconClass: "bg-[#2f80ff]/12 text-[#2f80ff]",
        links: [
          { label: text.strategy.links.brand, href: `/suite/${id}/profile`, icon: <UserSquare2 size={16} />, status: brandReady ? "ready" : "needs_setup" },
          { label: text.strategy.links.plan, href: `/suite/${id}/marketing-plan`, icon: <BookOpenText size={16} />, status: planReady ? "ready" : "needs_setup" },
          { label: text.strategy.links.workPlans, href: `/suite/${id}/work-plans`, icon: <ClipboardList size={16} />, status: workPlansReady ? "ready" : "needs_setup" },
          { label: text.strategy.links.logs, icon: <FileClock size={16} />, status: "soon" },
        ] satisfies SectionLink[],
      },
      {
        id: "creation",
        title: text.creation.title,
        eyebrow: text.creation.eyebrow,
        desc: text.creation.desc,
        icon: <WandSparkles size={24} />,
        accent: "from-[#ff4fa3]/16 via-[#f8d84a]/12 to-transparent",
        iconClass: "bg-[#ff4fa3]/12 text-[#ff4fa3]",
        links: [
          { label: text.creation.links.create, href: `/suite/${id}/create`, icon: <Sparkles size={16} />, status: brandReady ? "ready" : "needs_setup" },
          { label: text.creation.links.content, href: `/suite/${id}/content`, icon: <GalleryHorizontalEnd size={16} />, status: "ready" },
          { label: text.creation.links.productBulk, href: `/suite/${id}/product-bulk`, icon: <PackageOpen size={16} />, status: "ready" },
          { label: text.creation.links.videoMontage, href: `/suite/${id}/video-montage`, icon: <Clapperboard size={16} />, status: "soon" },
          { label: text.creation.links.calendar, href: `/suite/${id}/calendar`, icon: <CalendarDays size={16} />, status: "ready" },
          { label: text.creation.links.campaigns, href: `/suite/${id}/campaigns`, icon: <Archive size={16} />, status: "ready" },
          { label: text.creation.links.analytics, href: `/suite/${id}/analytics`, icon: <BarChart3 size={16} />, status: metaReady || googleReady ? "ready" : "needs_setup" },
        ] satisfies SectionLink[],
      },
      {
        id: "data",
        title: text.data.title,
        eyebrow: text.data.eyebrow,
        desc: text.data.desc,
        icon: <Database size={24} />,
        accent: "from-[#18b89d]/16 via-[#2f80ff]/10 to-transparent",
        iconClass: "bg-[#18b89d]/12 text-[#18b89d]",
        links: [
          { label: text.data.links.market, href: `/suite/${id}/market`, icon: <BookOpenText size={16} />, status: "ready" },
          { label: text.data.links.leads, icon: <UserRound size={16} />, status: "soon" },
          { label: text.data.links.customers, icon: <UserRound size={16} />, status: "soon" },
        ] satisfies SectionLink[],
      },
      {
        id: "settings",
        title: text.settings.title,
        eyebrow: text.settings.eyebrow,
        desc: text.settings.desc,
        icon: <Settings size={24} />,
        accent: "from-[#8b5cf6]/16 via-[#2f80ff]/10 to-transparent",
        iconClass: "bg-[#8b5cf6]/12 text-[#8b5cf6]",
        links: [
          { label: text.settings.links.connections, href: `/suite/${id}/connections`, icon: <Link2 size={16} />, status: metaReady || googleReady ? "ready" : "needs_setup" },
          { label: text.settings.links.billing, href: `/suite/${id}/billing`, icon: <Receipt size={16} />, status: "ready" },
          { label: text.settings.links.storage, href: `/suite/${id}/connections`, icon: <Database size={16} />, status: storageReady ? "ready" : "needs_setup" },
          { label: text.settings.links.settings, href: "/settings", icon: <Settings size={16} />, status: "ready" },
        ] satisfies SectionLink[],
      },
    ];
  }, [connections, id, storage, suite, text]);

  if (loading) return <div className="p-8 text-muted-foreground">{t("suite.status.loading")}</div>;
  if (!suite) return <div className="p-8 text-red-400">{t("suite.status.notFound")}</div>;

  return (
    <SuitePageShell title={suite.name} description={text.description}>
      <section className="grid w-full min-w-0 gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <SuiteAreaCard key={section.id} section={section} statusLabels={{ ready: text.statusReady, needs_setup: text.statusNeedsSetup, soon: text.soon, open: text.open }} />
        ))}
      </section>
    </SuitePageShell>
  );
}

function SuiteAreaCard({
  section,
  statusLabels,
}: {
  section: {
    title: string;
    eyebrow: string;
    desc: string;
    icon: React.ReactNode;
    accent: string;
    iconClass: string;
    links: SectionLink[];
  };
  statusLabels: { ready: string; needs_setup: string; soon: string; open: string };
}) {
  return (
    <article className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${section.accent}`} />
      <div className="relative">
        <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{section.eyebrow}</p>
            <h2 className="os-text-wrap mt-1 text-[1.65rem] font-black leading-tight text-foreground sm:text-2xl" dir="auto">{section.title}</h2>
            <p className="os-text-wrap mt-2 max-w-xl text-sm leading-6 text-muted-foreground" dir="auto">{section.desc}</p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${section.iconClass}`}>
            {section.icon}
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          {section.links.map((item) => (
            <AreaLink key={item.label} item={item} labels={statusLabels} />
          ))}
        </div>
      </div>
    </article>
  );
}

function AreaLink({ item, labels }: { item: SectionLink; labels: { ready: string; needs_setup: string; soon: string; open: string } }) {
  const status = item.status || "ready";
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
        {item.icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" dir="auto">{item.label}</span>
      <StatusPill status={status} labels={labels} />
      {item.href && <ArrowUpRight size={15} className="text-muted-foreground" />}
    </>
  );

  if (!item.href) {
    return (
      <div className="flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-dashed border-border bg-background/55 px-2.5 opacity-80">
        {content}
      </div>
    );
  }

  return (
    <Link href={item.href} className="flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-border bg-background/70 px-2.5 transition hover:bg-muted">
      {content}
    </Link>
  );
}

function StatusPill({ status, labels }: { status: "ready" | "needs_setup" | "soon"; labels: { ready: string; needs_setup: string; soon: string } }) {
  const styles = {
    ready: "bg-emerald-500/10 text-emerald-600",
    needs_setup: "bg-[#f8d84a]/20 text-[#9a6b00]",
    soon: "bg-muted text-muted-foreground",
  };
  const icon = status === "ready" ? <CheckCircle2 size={12} /> : null;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${styles[status]}`}>
      {icon}
      {labels[status]}
    </span>
  );
}
