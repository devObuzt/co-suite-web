"use client";
import { BrandMark } from "@/components/BrandMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { FunnelFooter } from "@/components/funnel/FunnelFooter";

export default function StartByConnecLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <BrandMark size="sm" />
          <div className="flex items-center gap-1.5">
            <ThemeSwitcher compact />
            <LanguageSwitcher placement="bottom" />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <FunnelFooter />
    </div>
  );
}
