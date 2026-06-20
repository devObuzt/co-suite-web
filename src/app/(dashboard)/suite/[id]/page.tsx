"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  GalleryHorizontalEnd,
  Link2,
  PackageOpen,
  Sparkles,
  UserSquare2,
} from "lucide-react";
import { api, Connections, StorageStatus, Suite } from "@/lib/api";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { useT } from "@/lib/i18n/LanguageContext";

export default function SuiteHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
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

  if (loading) return <div className="p-8 text-muted-foreground">{t("suite.status.loading")}</div>;
  if (!suite) return <div className="p-8 text-red-400">{t("suite.status.notFound")}</div>;

  const brandReady = Boolean(suite.brand?.name && (suite.brand?.services || []).length > 0);
  const metaReady = Boolean(connections.facebook?.connected || connections.instagram?.connected);
  const googleReady = Boolean(connections.google_ads?.connected);
  const storageReady = Boolean(storage?.configured);

  return (
    <SuitePageShell
      title={suite.name}
      description={t("suite.home.description")}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <HealthCard label={t("suite.home.health.brandProfile")} ready={brandReady} href={`/suite/${id}/profile`} readyLabel={t("suite.status.ready")} needsSetupLabel={t("suite.status.needsSetup")} />
        <HealthCard label="Meta" ready={metaReady} href={`/suite/${id}/connections`} />
        <HealthCard label="Google Ads" ready={googleReady} href={`/suite/${id}/connections`} />
        <HealthCard label={t("suite.home.health.mediaStorage")} ready={storageReady} href={`/suite/${id}/connections`} readyLabel={t("suite.status.ready")} needsSetupLabel={t("suite.status.needsSetup")} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <HomeAction
          href={`/suite/${id}/create`}
          icon={<Sparkles size={18} />}
          title={t("suite.nav.create")}
          description={t("suite.home.action.createDesc")}
        />
        <HomeAction
          href={`/suite/${id}/content`}
          icon={<GalleryHorizontalEnd size={18} />}
          title={t("suite.home.action.contentTitle")}
          description={t("suite.home.action.contentDesc")}
        />
        <HomeAction
          href={`/suite/${id}/analytics`}
          icon={<BarChart3 size={18} />}
          title={t("suite.nav.analytics")}
          description={t("suite.home.action.analyticsDesc")}
        />
        <HomeAction
          href={`/suite/${id}/connections`}
          icon={<Link2 size={18} />}
          title={t("suite.nav.connections")}
          description={t("suite.home.action.connectionsDesc")}
        />
        <HomeAction
          href={`/suite/${id}/profile`}
          icon={<UserSquare2 size={18} />}
          title={t("suite.nav.profile")}
          description={t("suite.home.action.profileDesc")}
        />
        <HomeAction
          href={`/suite/${id}/product-bulk`}
          icon={<PackageOpen size={18} />}
          title={t("suite.home.action.productBulkTitle")}
          description={t("suite.home.action.productBulkDesc")}
        />
      </section>
    </SuitePageShell>
  );
}

function HealthCard({
  label,
  ready,
  href,
  readyLabel,
  needsSetupLabel,
}: {
  label: string;
  ready: boolean;
  href: string;
  readyLabel?: string;
  needsSetupLabel?: string;
}) {
  const t = useT();
  return (
    <Link href={href} className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${ready ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" : "bg-muted"}`} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{ready ? readyLabel || t("suite.status.ready") : needsSetupLabel || t("suite.status.needsSetup")}</p>
    </Link>
  );
}

function HomeAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </Link>
  );
}
