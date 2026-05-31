"use client";

import { use } from "react";
import { SuiteLegacyDashboard } from "@/components/suite/SuiteLegacyDashboard";

export default function SuiteDashboardRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SuiteLegacyDashboard suiteId={id} />;
}
