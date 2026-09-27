/** Footer for the public funnel landing pages: the brand line, nothing else.
 *
 * It used to carry sign-out and "delete and start over" too. Those now live
 * behind the wordmark in the journey's own header — a link that wipes
 * everything you built does not belong in a footer, under every screen, where
 * people expect harmless text. */
export function FunnelFooter() {
  return (
    <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
      Connec × OneShare
    </footer>
  );
}
