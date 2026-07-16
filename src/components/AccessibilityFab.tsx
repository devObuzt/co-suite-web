"use client";
import { Dialog } from "@base-ui/react/dialog";
import { Accessibility, X } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageContext";
import { AccessibilityPanelContent } from "@/components/AccessibilityPanel";

/**
 * Floating accessibility button, mounted globally in the root layout.
 * Opens a focus-trapped dialog (Esc closes, focus returns to the button)
 * housing the accessibility preference controls.
 */
export function AccessibilityFab() {
  const t = useT();

  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label={t("a11y.openLabel")}
        className="fixed bottom-4 end-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Accessibility size={22} aria-hidden="true" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup
          className="fixed bottom-4 end-4 z-50 flex max-h-[80dvh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl transition-[opacity,transform] data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <Dialog.Title className="text-base font-semibold text-foreground">
              {t("a11y.title")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("a11y.close")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X size={17} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <AccessibilityPanelContent />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
