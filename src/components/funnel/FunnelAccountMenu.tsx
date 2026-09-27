"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";
import { useT } from "@/lib/i18n/LanguageContext";
import { useAuthStore } from "@/store/auth";

/**
 * The wordmark doubles as the account menu.
 *
 * Sign out and "delete and start over" used to sit in the page footer, under
 * every screen of the journey — a permanent invitation to wipe your work,
 * parked where a footer normally holds harmless links. They live behind the
 * logo now: still one tap away, but out of the path of the actual task.
 */
export function FunnelAccountMenu() {
  const t = useT();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function signOut() {
    logout();
    router.push("/startbyconnec");
  }

  async function restart() {
    if (!window.confirm(t("funnel.restartConfirm"))) return;
    setBusy(true);
    try {
      await api.funnel.restart();
    } catch {
      // Already clean, or the call failed — the point was to start over.
    } finally {
      signOut();
    }
  }

  // Signed out, the logo is just a logo.
  if (!user) return <BrandMark size="sm" />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="rounded-xl transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <BrandMark size="sm" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div ref={panelRef} className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <BrandMark size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("suite.danger.cancel")}
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {user.email && (
              <p className="mt-3 truncate text-xs text-muted-foreground" dir="auto">
                {user.phone || user.email}
              </p>
            )}

            <div className="mt-4 space-y-1.5">
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-start text-sm font-semibold text-foreground transition hover:bg-accent"
              >
                <LogOut size={16} className="rtl:-scale-x-100" />
                {t("nav.signOut")}
              </button>
              <button
                type="button"
                onClick={restart}
                disabled={busy}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-start text-sm font-semibold text-red-600 transition hover:bg-red-500/10 disabled:opacity-60 dark:text-red-400"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {t("funnel.restart")}
              </button>
            </div>

            <p className="mt-4 border-t border-border pt-3 text-center text-xs text-muted-foreground">
              Connec × OneShare
            </p>
          </div>
        </div>
      )}
    </>
  );
}
