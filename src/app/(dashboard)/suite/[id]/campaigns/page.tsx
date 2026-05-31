"use client";

import { use } from "react";
import { CampaignsHub } from "@/components/suite/SuiteLegacyDashboard";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

export default function CampaignsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <SuitePageShell title="Sponsored Campaign Builder" description="View active campaigns now. Campaign creation flow comes next.">
      <CampaignsHub suiteId={id} />
    </SuitePageShell>
  );
}
