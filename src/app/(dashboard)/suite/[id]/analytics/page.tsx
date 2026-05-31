"use client";

import { use } from "react";
import { AnalyticsTab, CampaignsHub } from "@/components/suite/SuiteLegacyDashboard";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <SuitePageShell title="معطيات وتحليل" description="Page insights, Meta campaigns, and Google Ads performance in one place.">
      <CampaignsHub suiteId={id} />
      <AnalyticsTab suiteId={id} />
    </SuitePageShell>
  );
}
