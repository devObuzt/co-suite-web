"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeContext";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card text-card-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${
        compact ? "h-9 w-9" : "h-9 px-3 text-sm"
      }`}
    >
      {isDark ? <Moon size={15} /> : <Sun size={15} />}
      {!compact && <span>{isDark ? "Dark" : "Light"}</span>}
    </button>
  );
}
