"use client";
import { BrandMark } from "@/components/BrandMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function StartByConnecLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <BrandMark size="sm" />
          <LanguageSwitcher placement="bottom" />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Connec × OneShare
      </footer>
    </div>
  );
}
