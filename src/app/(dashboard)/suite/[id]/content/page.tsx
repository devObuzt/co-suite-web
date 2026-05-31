"use client";

import { use } from "react";
import { ContentTab } from "@/components/suite/SuiteLegacyDashboard";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

export default function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <SuitePageShell title="Content" description="Review generated content from newest to oldest.">
      <ContentTab suiteId={id} />
    </SuitePageShell>
  );
}
