"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useT } from "@/lib/i18n/LanguageContext";
import { useAuthStore } from "@/store/auth";

export default function StartByConnecLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const { user, logout } = useAuthStore();
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
      <footer className="space-y-2 border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>Connec × OneShare</p>
        {user && (
          // Lets a second person try the funnel from the same device/browser.
          <button
            type="button"
            onClick={() => { logout(); router.push("/startbyconnec"); }}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut size={12} className="rtl:-scale-x-100" />
            {t("nav.signOut")}
          </button>
        )}
      </footer>
    </div>
  );
}
