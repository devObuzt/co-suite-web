"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n/LanguageContext";
import { useAuthStore } from "@/store/auth";

/** Shared footer for every funnel surface (landing pages AND the wizard/plan
 * chrome): brand line + a logout link so a second person can try the journey
 * from the same device/browser.
 *
 * Next to it, "delete and start over". Signing out alone does not reset
 * anything — coming back lands on the same half-built suite with the stage
 * budgets already spent. This erases the suite and puts the lead back to the
 * beginning, then signs out, which is what people actually mean by starting
 * again. */
export function FunnelFooter() {
  const t = useT();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [busy, setBusy] = useState(false);

  function signOut() {
    logout();
    router.push("/startbyconnec");
  }

  async function restart() {
    if (!window.confirm(t("funnel.restartConfirm"))) return;
    setBusy(true);
    try {
      // One call. Deleting the suite was not enough — and with no suite linked
      // it deleted nothing at all, so pressing this did visibly nothing while
      // the lead stayed marked as finished and login kept landing on /done.
      await api.funnel.restart();
    } catch {
      // Already clean, or the call failed — the point of pressing this was to
      // start over, so sign out either way.
    } finally {
      signOut();
    }
  }

  return (
    <footer className="space-y-2 border-t border-border py-4 text-center text-xs text-muted-foreground">
      <p>Connec × OneShare</p>
      {user && (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut size={12} className="rtl:-scale-x-100" />
            {t("nav.signOut")}
          </button>
          <span aria-hidden className="text-border">·</span>
          <button
            type="button"
            onClick={restart}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-red-600 disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {t("funnel.restart")}
          </button>
        </div>
      )}
    </footer>
  );
}
