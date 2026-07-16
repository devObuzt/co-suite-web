"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type FontScale = 100 | 125 | 150;
export type Contrast = "normal" | "high";
export type Motion = "normal" | "reduced";

export interface A11yPrefs {
  theme: ThemeMode;
  fontScale: FontScale;
  contrast: Contrast;
  motion: Motion;
}

export const FONT_SCALES: FontScale[] = [100, 125, 150];

const DEFAULTS: A11yPrefs = {
  theme: "light",
  fontScale: 100,
  contrast: "normal",
  motion: "normal",
};

export const A11Y_STORAGE_KEY = "oneshare_a11y_prefs";
const LEGACY_THEME_KEY = "co_suite_theme";

interface A11yContextValue extends A11yPrefs {
  /** Theme after resolving "system" against the OS preference. */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  setFontScale: (scale: FontScale) => void;
  setContrast: (contrast: Contrast) => void;
  setMotion: (motion: Motion) => void;
  /** Backwards-compatible: flips resolved light/dark. */
  toggleTheme: () => void;
  reset: () => void;
}

const AccessibilityContext = createContext<A11yContextValue>({
  ...DEFAULTS,
  resolvedTheme: "light",
  setTheme: () => {},
  setFontScale: () => {},
  setContrast: () => {},
  setMotion: () => {},
  toggleTheme: () => {},
  reset: () => {},
});

function normScale(value: unknown): FontScale {
  return FONT_SCALES.includes(value as FontScale) ? (value as FontScale) : 100;
}

function readStored(): A11yPrefs {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<A11yPrefs>;
      return {
        theme: p.theme === "dark" || p.theme === "system" ? p.theme : "light",
        fontScale: normScale(p.fontScale),
        contrast: p.contrast === "high" ? "high" : "normal",
        motion: p.motion === "reduced" ? "reduced" : "normal",
      };
    }
    // Migrate the legacy theme-only key (read-only; not written back).
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === "dark" || legacy === "light") return { ...DEFAULTS, theme: legacy };
  } catch {
    /* private mode / disabled storage — fall through to defaults */
  }
  return DEFAULTS;
}

/** Reflects the resolved preferences onto <html>. Mirrors the inline pre-paint
 * script in the root layout. Pure DOM side-effect — no React state. */
function applyToDom(p: A11yPrefs, resolved: "light" | "dark") {
  const d = document.documentElement;
  d.classList.toggle("dark", resolved === "dark");
  d.dataset.theme = resolved;
  d.style.fontSize = `${p.fontScale}%`;
  if (p.contrast === "high") d.dataset.contrast = "high";
  else delete d.dataset.contrast;
  if (p.motion === "reduced") d.dataset.motion = "reduced";
  else delete d.dataset.motion;
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULTS);
  const [systemDark, setSystemDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // One-time hydration from storage. localStorage is browser-only, so this must
  // run in an effect; the inline <head> script already applied it pre-paint.
  useEffect(() => {
    const stored = readStored();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from localStorage
    setPrefs(stored);
    setHydrated(true);
  }, []);

  // Track the OS color scheme so theme:"system" can resolve and stay in sync.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial read of a browser-only API
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: "light" | "dark" =
    prefs.theme === "system" ? (systemDark ? "dark" : "light") : prefs.theme;

  // Reflect changes onto <html> after hydration. Pure DOM side-effect.
  useEffect(() => {
    if (!hydrated) return;
    applyToDom(prefs, resolvedTheme);
  }, [prefs, resolvedTheme, hydrated]);

  // Applies a patch AND persists — the single write path for user actions.
  const commit = useCallback((patch: Partial<A11yPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => commit({ theme }), [commit]);
  const setFontScale = useCallback((fontScale: FontScale) => commit({ fontScale }), [commit]);
  const setContrast = useCallback((contrast: Contrast) => commit({ contrast }), [commit]);
  const setMotion = useCallback((motion: Motion) => commit({ motion }), [commit]);
  const toggleTheme = useCallback(
    () => commit({ theme: resolvedTheme === "dark" ? "light" : "dark" }),
    [commit, resolvedTheme]
  );
  const reset = useCallback(() => commit(DEFAULTS), [commit]);

  return (
    <AccessibilityContext.Provider
      value={{
        ...prefs,
        resolvedTheme,
        setTheme,
        setFontScale,
        setContrast,
        setMotion,
        toggleTheme,
        reset,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityContext);

/** Backwards-compatible theme hook for existing consumers (ThemeSwitcher). */
export const useTheme = () => {
  const { resolvedTheme, setTheme, toggleTheme } = useContext(AccessibilityContext);
  return { theme: resolvedTheme, setTheme, toggleTheme };
};
