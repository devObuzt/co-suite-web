"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { useT } from "@/lib/i18n/LanguageContext";
import { useAuthStore } from "@/store/auth";

export function FrozenScreen() {
  const t = useT();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-8 text-center space-y-5">
        <div className="flex justify-center"><BrandMark size="sm" /></div>
        <h1 className="text-2xl font-bold">{t("frozen.title")}</h1>
        <p className="text-muted-foreground leading-relaxed">{t("frozen.body")}</p>
        <Button size="lg" className="w-full" render={<Link href="/startbyconnec">{t("frozen.cta")}</Link>} />
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("frozen.logout")}
        </button>
      </div>
    </div>
  );
}
