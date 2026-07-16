"use client";
// Backwards-compatibility shim. The theme now lives in the unified
// accessibility preferences context. Prefer importing from
// "@/lib/accessibility/AccessibilityContext" directly.
export {
  AccessibilityProvider as ThemeProvider,
  useTheme,
} from "@/lib/accessibility/AccessibilityContext";
export type { ThemeMode } from "@/lib/accessibility/AccessibilityContext";
