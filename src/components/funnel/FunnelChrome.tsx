"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { FunnelFooter } from "@/components/funnel/FunnelFooter";
import { useT } from "@/lib/i18n/LanguageContext";
import { api, FunnelState } from "@/lib/api";

const STEP_KEYS = ["suite", "plan", "work", "services", "request"] as const;

function stepHrefs(suiteId: string | null): Record<(typeof STEP_KEYS)[number], string> {
  return {
    suite: "/suite/new",
    plan: suiteId ? `/suite/${suiteId}/marketing-plan` : "/suite/new",
    work: suiteId ? `/suite/${suiteId}/work-plans` : "/suite/new",
    services: "/startbyconnec/services",
    request: "/startbyconnec/request",
  };
}

function currentIndex(pathname: string): number {
  if (pathname.startsWith("/startbyconnec/request")) return 4;
  if (pathname.startsWith("/startbyconnec/services")) return 3;
  if (pathname.includes("/work-plans")) return 2;
  if (pathname.includes("/marketing-plan")) return 1;
  return 0;
}

export function FunnelChrome({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<FunnelState | null>(null);

  useEffect(() => {
    api.funnel.state().then(setState).catch(() => setState(null));
  }, [pathname]);

  const suiteId = state?.suite_id ?? null;
  const hrefs = stepHrefs(suiteId);
  const idx = currentIndex(pathname);
  const nextKey = STEP_KEYS[Math.min(idx + 1, STEP_KEYS.length - 1)];
  const nextDisabled = idx === 0 && !suiteId;

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <BrandMark size="sm" />
          <ol className="hidden md:flex items-center gap-2 text-xs">
            {STEP_KEYS.map((key, i) => (
              <li
                key={key}
                className={`px-2 py-1 rounded-full border ${
                  i === idx
                    ? "border-indigo-500 text-indigo-500 font-semibold"
                    : i < idx
                      ? "border-border text-muted-foreground line-through"
                      : "border-border text-muted-foreground"
                }`}
              >
                {i + 1}. {t(`funnel.steps.${key}`)}
              </li>
            ))}
          </ol>
          {idx < STEP_KEYS.length - 1 && (
            <Button size="sm" disabled={nextDisabled} onClick={() => router.push(hrefs[nextKey])}>
              {t("funnel.next")}
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <FunnelFooter />
    </div>
  );
}
