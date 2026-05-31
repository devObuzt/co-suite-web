"use client";

import { use } from "react";
import { ContentTab } from "@/components/suite/SuiteLegacyDashboard";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

export default function CreatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <SuitePageShell title="Create & Generate" description="Create posts, ads, image sets, videos, carousels, and campaign drafts.">
      <ContentTab suiteId={id} />
    </SuitePageShell>
  );
}
