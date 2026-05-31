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

export default function SuiteHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!suite) return <div className="p-8 text-red-400">Suite not found</div>;

  const brandReady = Boolean(suite.brand?.name && (suite.brand?.services || []).length > 0);
  const metaReady = Boolean(connections.facebook?.connected || connections.instagram?.connected);
  const googleReady = Boolean(connections.google_ads?.connected);
  const storageReady = Boolean(storage?.configured);

  return (
    <SuitePageShell
      title={suite.name}
      description="Your suite command center. Start with creation, check health, then jump into deeper tools only when needed."
    >
      <section className="grid gap-3 md:grid-cols-4">
        <HealthCard label="Brand profile" ready={brandReady} href={`/suite/${id}/profile`} />
        <HealthCard label="Meta" ready={metaReady} href={`/suite/${id}/connections`} />
        <HealthCard label="Google Ads" ready={googleReady} href={`/suite/${id}/connections`} />
        <HealthCard label="Media storage" ready={storageReady} href={`/suite/${id}/connections`} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <HomeAction
          href={`/suite/${id}/create`}
          icon={<Sparkles size={18} />}
          title="Create & Generate"
          description="Create posts, ads, sets, images, videos, and carousels."
        />
        <HomeAction
          href={`/suite/${id}/content`}
          icon={<GalleryHorizontalEnd size={18} />}
          title="Recent content"
          description="Review generated work from newest to oldest."
        />
        <HomeAction
          href={`/suite/${id}/analytics`}
          icon={<BarChart3 size={18} />}
          title="Analytics"
          description="Review page, campaign, and channel performance."
        />
        <HomeAction
          href={`/suite/${id}/connections`}
          icon={<Link2 size={18} />}
          title="Connections"
          description="Manage Meta, Google Ads, TikTok, and media storage."
        />
        <HomeAction
          href={`/suite/${id}/profile`}
          icon={<UserSquare2 size={18} />}
          title="Brand/Profile"
          description="Edit the business memory that powers generation."
        />
        <HomeAction
          href={`/suite/${id}/product-bulk`}
          icon={<PackageOpen size={18} />}
          title="Product Bulk Studio"
          description="Generate product catalog creatives from Excel and ZIP files."
        />
      </section>
    </SuitePageShell>
  );
}

function HealthCard({
  label,
  ready,
  href,
}: {
  label: string;
  ready: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${ready ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" : "bg-muted"}`} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{ready ? "Ready" : "Needs setup"}</p>
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
