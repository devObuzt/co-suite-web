"use client";

import { use } from "react";
import { ConnectionsPanel } from "@/components/suite/SuiteLegacyDashboard";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

export default function ConnectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <SuitePageShell title="Connections" description="Connect publishing, analytics, campaign, and media storage providers.">
      <ConnectionsPanel suiteId={id} />
    </SuitePageShell>
  );
}
