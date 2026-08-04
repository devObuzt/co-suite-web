"use client";

import { usePathname } from "next/navigation";
import { AccessibilityFab } from "@/components/AccessibilityFab";
import { FirstTimeLanguagePicker } from "@/components/FirstTimeLanguagePicker";

/**
 * Routes under /ex/ are standalone, client-branded surfaces (business cards
 * and other extras). They must render exactly as designed — no co-Suite
 * accessibility FAB, no first-visit language prompt on top of a client's page.
 */
const BARE_PREFIXES = ["/ex/"];

export function GlobalChrome() {
  const pathname = usePathname();
  if (BARE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <>
      <AccessibilityFab />
      <FirstTimeLanguagePicker />
    </>
  );
}
