"use client";

/**
 * Funnel-wide fixed bottom action bar: the primary confirm button of every
 * startbyconnec step lives here so it is always visible on screen.
 * Renders a spacer so page content never hides behind the bar.
 */
export function StickyCta({
  children,
  maxWidthClass = "max-w-md",
}: {
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  return (
    <>
      <div className="h-24" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className={`mx-auto ${maxWidthClass}`}>{children}</div>
      </div>
    </>
  );
}
