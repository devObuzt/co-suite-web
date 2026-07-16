"use client";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { Switch } from "@base-ui/react/switch";
import { RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageContext";
import {
  useAccessibility,
  FONT_SCALES,
  type ThemeMode,
  type FontScale,
} from "@/lib/accessibility/AccessibilityContext";

/** A segmented radiogroup of mutually-exclusive options. */
function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Radio.Root
            key={String(opt.value)}
            value={opt.value}
            className={`min-h-[var(--touch-target)] rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </Radio.Root>
        );
      })}
    </RadioGroup>
  );
}

/** A labelled toggle switch row. */
function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div id={labelId} className="text-sm font-medium text-foreground">
          {label}
        </div>
        <div id={descId} className="text-xs text-muted-foreground">
          {description}
        </div>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
        aria-describedby={descId}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <Switch.Thumb className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background shadow transition-[inset-inline-start] data-[unchecked]:start-0.5 data-[checked]:start-[1.375rem]" />
      </Switch.Root>
    </div>
  );
}

/** The inner content of the accessibility panel — pure, no dialog wiring. */
export function AccessibilityPanelContent() {
  const t = useT();
  const {
    theme,
    fontScale,
    contrast,
    motion,
    setTheme,
    setFontScale,
    setContrast,
    setMotion,
    reset,
  } = useAccessibility();

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "light", label: t("a11y.themeLight") },
    { value: "dark", label: t("a11y.themeDark") },
    { value: "system", label: t("a11y.themeSystem") },
  ];

  const fontOptions = FONT_SCALES.map((s) => ({ value: s as FontScale, label: `${s}%` }));

  return (
    <div className="flex flex-col gap-5">
      {/* Theme */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("a11y.theme")}
        </h3>
        <Segmented label={t("a11y.theme")} value={theme} options={themeOptions} onChange={setTheme} />
      </section>

      {/* Text size */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("a11y.textSize")}
        </h3>
        <Segmented
          label={t("a11y.textSize")}
          value={fontScale}
          options={fontOptions}
          onChange={setFontScale}
        />
        <p className="os-text-wrap rounded-md border border-border bg-muted/30 px-3 py-2 text-foreground" dir="auto">
          {t("a11y.previewText")}
        </p>
      </section>

      {/* Toggles */}
      <section className="flex flex-col gap-4">
        <ToggleRow
          id="a11y-contrast"
          label={t("a11y.highContrast")}
          description={t("a11y.highContrastDesc")}
          checked={contrast === "high"}
          onCheckedChange={(on) => setContrast(on ? "high" : "normal")}
        />
        <ToggleRow
          id="a11y-motion"
          label={t("a11y.reduceMotion")}
          description={t("a11y.reduceMotionDesc")}
          checked={motion === "reduced"}
          onCheckedChange={(on) => setMotion(on ? "reduced" : "normal")}
        />
      </section>

      {/* Reset */}
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-[var(--touch-target)] items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <RotateCcw size={15} aria-hidden="true" />
        {t("a11y.reset")}
      </button>
    </div>
  );
}
