"use client";

import { use, useEffect, useState } from "react";
import { api, Suite } from "@/lib/api";
import { CompetitorsSection, MetaAdsInspirationSection } from "@/components/suite/SuiteLegacyDashboard";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [suite, setSuite] = useState<Suite | null>(null);

  useEffect(() => {
    api.suites.get(id).then(setSuite).catch(() => setSuite(null));
  }, [id]);

  return (
    <SuitePageShell title="المنافسين والسوق" description="Research competitors, market signals, and active ad inspiration.">
      <CompetitorsSection suiteId={id} strategy={suite?.strategy ?? null} />
      <MetaAdsInspirationSection suiteId={id} />
    </SuitePageShell>
  );
}
