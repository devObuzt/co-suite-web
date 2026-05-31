"use client";

import { use } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

export default function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <SuitePageShell
      title="Social Calendar Builder"
      description="Build a repeatable social content calendar. The detailed builder will be implemented after the workspace split is stable."
    >
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <CalendarDays size={34} className="mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Calendar builder foundation is ready.</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          For now, use the existing loops page to manage social loops. This screen becomes the full calendar builder in the next phase.
        </p>
        <Link href={`/suite/${id}/loops`} className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Open social loops
        </Link>
      </div>
    </SuitePageShell>
  );
}
