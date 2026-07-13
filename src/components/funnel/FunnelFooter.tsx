"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageContext";
import { useAuthStore } from "@/store/auth";

/** Shared footer for every funnel surface (landing pages AND the wizard/plan
 * chrome): brand line + a logout link so a second person can try the journey
 * from the same device/browser. */
export function FunnelFooter() {
  const t = useT();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  return (
    <footer className="space-y-2 border-t border-border py-4 text-center text-xs text-muted-foreground">
      <p>Connec × OneShare</p>
      {user && (
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
  );
}
