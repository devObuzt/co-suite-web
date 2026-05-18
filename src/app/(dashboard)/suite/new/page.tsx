"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Brand, MarketingStrategy } from "@/lib/api";
import { useT, useLanguage } from "@/lib/i18n/LanguageContext";
import { LANGUAGES, LangCode } from "@/lib/i18n/translations";
import { getSuggestions, findNicheIndex, getEnglishNiche } from "@/lib/i18n/suggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Plus, X, CheckCircle2, ChevronRight,
  AtSign, AlertCircle,
} from "lucide-react";

type Step = "name" | "links" | "extracting"
  | "step-a" | "step-b" | "step-c" | "step-d" | "step-e" | "step-f" | "step-g"
  | "strategy" | "preview" | "done";

// ── Platform helpers ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "website",   label: "Website",   placeholder: "https://your-website.com",          hint: "Main website" },
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourpage",     hint: "Instagram profile" },
  { id: "facebook",  label: "Facebook",  placeholder: "https://facebook.com/yourpage",      hint: "Facebook page" },
  { id: "tiktok",    label: "TikTok",    placeholder: "https://tiktok.com/@yourhandle",     hint: "TikTok profile" },
  { id: "linkedin",  label: "LinkedIn",  placeholder: "https://linkedin.com/company/yours", hint: "LinkedIn company" },
  { id: "other",     label: "Other",     placeholder: "Any other relevant link",            hint: "Other link" },
];


const LANG_TO_DIALECT: Record<string, string> = {
  "ar": "Palestinian Arabic", "he": "Hebrew", "en": "English",
  "fr": "French", "es": "Spanish", "tr": "Turkish",
};

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current, steps }: { current: Step; steps: { key: Step; label: string }[] }) {
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
            i < idx ? "bg-indigo-600 text-white" : i === idx ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-500"
          }`}>
            {i < idx ? "✓" : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${i === idx ? "text-white" : "text-zinc-500"}`}>{s.label}</span>
          {i < steps.length - 1 && <div className="w-5 h-px bg-zinc-700" />}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewSuitePage() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLanguage();
  const suggestions = getSuggestions(lang);

  const LOCATION_SCOPES: { value: string; label: string }[] = [
    { value: "Worldwide", label: t("suite.new.scopeWorldwide") },
    { value: "Middle East", label: t("suite.new.scopeMiddleEast") },
    { value: "Europe", label: t("suite.new.scopeEurope") },
    { value: "North America", label: t("suite.new.scopeNorthAmerica") },
    { value: "Asia", label: t("suite.new.scopeAsia") },
    { value: "Custom", label: t("suite.new.scopeCustom") },
  ];

  const STEPS: { key: Step; label: string }[] = [
    { key: "name", label: t("suite.new.stepName") },
    { key: "links", label: t("suite.new.stepLinks") },
    { key: "extracting", label: t("suite.new.stepAnalyzing") },
    { key: "step-a", label: t("suite.new.stepBizName") },
    { key: "step-b", label: t("suite.new.stepCategory") },
    { key: "step-c", label: t("suite.new.stepLanguages") },
    { key: "step-d", label: t("suite.new.stepServices") },
    { key: "step-e", label: t("suite.new.stepAudience") },
    { key: "step-f", label: t("suite.new.stepWhyUs") },
    { key: "step-g", label: t("suite.new.stepBrand") },
    { key: "strategy", label: t("suite.new.stepStrategy") },
    { key: "preview", label: t("suite.new.stepPreview") },
    { key: "done", label: t("suite.new.stepDone") },
  ];

  const [step, setStep] = useState<Step>("name");
  const [suiteName, setSuiteName] = useState("");
  const [suiteId, setSuiteId] = useState("");
  const [links, setLinks] = useState<{ platform: string; url: string }[]>([
    { platform: "website", url: "" },
    { platform: "instagram", url: "" },
  ]);
  const [businessName, setBusinessName] = useState("");
  const [brand, setBrand] = useState<Brand | null>(null);
  const [error, setError] = useState("");
  const [extractLog, setExtractLog] = useState("");
  const [strategy, setStrategy] = useState<MarketingStrategy | null>(null);
  const [strategyError, setStrategyError] = useState("");

  // Step A
  const [bizName, setBizName] = useState("");
  // Step B
  const [selectedNicheIdx, setSelectedNicheIdx] = useState(-1); // index into suggestions.niches
  const [customNiche, setCustomNiche] = useState("");
  const [showNicheInput, setShowNicheInput] = useState(false);
  // Step C
  const [orderedLangs, setOrderedLangs] = useState<string[]>([]);
  // Step D
  const [serviceItems, setServiceItems] = useState<string[]>([]);
  // Step E
  const [locationScope, setLocationScope] = useState("Worldwide");
  const [customCountries, setCustomCountries] = useState("");
  const [customCities, setCustomCities] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  // Step F
  const [uspPoints, setUspPoints] = useState<string[]>([]);
  const [espPoints, setEspPoints] = useState<string[]>([]);
  // Step G
  const [generatingLogo, setGeneratingLogo] = useState(false);
  const [generatingColors, setGeneratingColors] = useState(false);
  const [generatingFonts, setGeneratingFonts] = useState(false);
  const [logoStyle, setLogoStyle] = useState<"icon_only" | "with_name" | "initials">("icon_only");
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [localColors, setLocalColors] = useState<{ primary: string; secondary: string; accent: string }>({
    primary: "#4f46e5", secondary: "#818cf8", accent: "#c7d2fe",
  });

  // ── Step 1: name ─────────────────────────────────────────────────────────

  async function handleCreateSuite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const suite = await api.suites.create({ name: suiteName });
      setSuiteId(suite.id);
      setBusinessName(suiteName);
      setStep("links");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  // ── Step 2: links ─────────────────────────────────────────────────────────

  function addLink() {
    setLinks((l) => [...l, { platform: "other", url: "" }]);
  }

  function removeLink(i: number) {
    setLinks((l) => l.filter((_, idx) => idx !== i));
  }

  function setLinkUrl(i: number, url: string) {
    setLinks((l) => l.map((item, idx) => idx === i ? { ...item, url } : item));
  }

  function setLinkPlatform(i: number, platform: string) {
    setLinks((l) => l.map((item, idx) => idx === i ? { ...item, platform } : item));
  }

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const urls = links.map((l) => l.url).filter(Boolean);
    if (urls.length === 0) {
      setError("Add at least one link so we can research your business");
      return;
    }
    setStep("extracting");
    setExtractLog("Scraping your links…");
    const t1 = setTimeout(() => setExtractLog("Searching the web for more info about your business…"), 4000);
    const t2 = setTimeout(() => setExtractLog("Analyzing brand colors, services, and identity with AI…"), 9000);
    try {
      const res = await api.onboarding.extractBrand({
        suite_id: suiteId,
        urls,
        business_name: businessName || suiteName,
      });
      clearTimeout(t1);
      clearTimeout(t2);
      setBrand(res.brand);
      setBizName(res.brand?.name || suiteName);
      setSelectedNicheIdx(findNicheIndex(res.brand?.industry || ""));
      setOrderedLangs(res.brand?.audience_languages || []);
      setServiceItems([...(res.brand?.services || []), ...(res.brand?.products || [])].filter(Boolean));
      // Pre-fill USP/ESP — translate to user's language if not English
      const rawUsp = res.brand?.unique_value || "";
      const rawEsp = res.brand?.esp || "";
      const rawHelp = res.brand?.how_they_help || "";

      if (lang !== "en" && (rawUsp || rawEsp || rawHelp)) {
        setUspPoints(rawUsp ? [rawUsp] : []);
        setEspPoints(rawEsp ? [rawEsp] : []);
        try {
          const translated = await api.onboarding.translateBrandFields({
            unique_value: rawUsp,
            esp: rawEsp,
            how_they_help: rawHelp,
            target_language: lang,
          });
          if (translated.unique_value) setUspPoints([translated.unique_value]);
          if (translated.esp) setEspPoints([translated.esp]);
        } catch {
          // Keep originals on failure
        }
      } else {
        setUspPoints(res.brand?.usp_points || (rawUsp ? [rawUsp] : []));
        setEspPoints(res.brand?.esp_points || (rawEsp ? [rawEsp] : []));
      }
      setLocalColors({
        primary: res.brand?.colors?.primary || "#4f46e5",
        secondary: res.brand?.colors?.secondary || "#818cf8",
        accent: res.brand?.colors?.accent || "#c7d2fe",
      });
      setStep("step-a");
    } catch {
      clearTimeout(t1);
      clearTimeout(t2);
      setBizName(suiteName);
      setSelectedNicheIdx(-1);
      setOrderedLangs([]);
      setServiceItems([]);
      setStep("step-a");
    }
  }

  async function runGenerateStrategy() {
    setStrategyError("");
    try {
      const res = await api.onboarding.generateStrategy({ suite_id: suiteId, user_language: lang });
      setStrategy(res.strategy);
      setStep("preview");
    } catch (err: unknown) {
      setStrategyError(err instanceof Error ? err.message : "Strategy generation failed. Please try again.");
    }
  }

  async function saveStep(step: string, data: Partial<Brand>) {
    try {
      await api.onboarding.saveBrandStep({ suite_id: suiteId, step, data });
      setBrand(prev => ({ ...(prev || {}), ...data }));
    } catch {
      // non-fatal
    }
  }

  async function generateAssets(types: string[]) {
    if (types.includes("logo")) setGeneratingLogo(true);
    if (types.includes("colors")) setGeneratingColors(true);
    if (types.includes("fonts")) setGeneratingFonts(true);
    try {
      const res = await api.onboarding.generateBrandAssets({
        suite_id: suiteId,
        generate: types,
        logo_style: logoStyle,
        user_language: lang,
      });
      setBrand(res.brand);
      if (res.brand.colors) {
        setLocalColors({
          primary: res.brand.colors.primary || localColors.primary,
          secondary: res.brand.colors.secondary || localColors.secondary,
          accent: res.brand.colors.accent || localColors.accent,
        });
      }
    } catch {
      // ignore
    } finally {
      if (types.includes("logo")) setGeneratingLogo(false);
      if (types.includes("colors")) setGeneratingColors(false);
      if (types.includes("fonts")) setGeneratingFonts(false);
    }
  }

  async function uploadBrandAsset(assetType: "logo" | "font", file: File, language?: string) {
    // Show local preview immediately for logos (before R2 upload completes)
    if (assetType === "logo") {
      const localUrl = URL.createObjectURL(file);
      setBrand((prev) => ({ ...(prev || {}), logo_url: localUrl, logo_source: "uploaded" }));
    }
    setUploadingAsset(true);
    try {
      const res = await api.onboarding.uploadBrandAsset(suiteId, assetType, file, language);
      setBrand(res.brand);
    } catch {
      // local preview stays even if upload fails
    } finally {
      setUploadingAsset(false);
    }
  }

  async function saveColors() {
    await saveStep("g-colors", {
      colors: { primary: localColors.primary, secondary: localColors.secondary, accent: localColors.accent },
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t("suite.new.title")}</h1>
        <p className="text-zinc-400 text-sm mt-1">{t("suite.new.subtitle")}</p>
      </div>

      <StepIndicator current={step} steps={STEPS} />

      {/* ── Step 1: Name ── */}
      {step === "name" && (
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle>What's this suite for?</CardTitle>
            <CardDescription className="text-zinc-400">Usually your business name</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSuite} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Suite name</Label>
                <Input
                  value={suiteName}
                  onChange={(e) => setSuiteName(e.target.value)}
                  placeholder="e.g. Connec Agency"
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                Continue <ChevronRight size={16} />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Links ── */}
      {step === "links" && (
        <form onSubmit={handleExtract} className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Add your business links</CardTitle>
              <CardDescription className="text-zinc-400">
                Paste any links you have — website, Instagram, Facebook, TikTok, LinkedIn.
                The more you add, the richer your brand profile will be.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Business name override */}
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Business name (optional override)</Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={suiteName}
                  className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-600"
                />
              </div>

              <Separator className="bg-zinc-800" />

              {/* Link rows */}
              <div className="space-y-2">
                {links.map((link, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    {/* Platform selector */}
                    <select
                      value={link.platform}
                      onChange={(e) => setLinkPlatform(i, e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-md px-2 py-2 h-9 shrink-0 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>

                    {/* URL input */}
                    <Input
                      value={link.url}
                      onChange={(e) => setLinkUrl(i, e.target.value)}
                      placeholder={PLATFORMS.find((p) => p.id === link.platform)?.placeholder || "https://..."}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm flex-1 placeholder:text-zinc-600"
                    />

                    {/* Remove button */}
                    {links.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLink(i)}
                        className="text-zinc-600 hover:text-red-400 transition-colors mt-2"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add link button */}
              <button
                type="button"
                onClick={addLink}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
              >
                <Plus size={13} /> Add another link
              </button>

              {/* Platform badges hint */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Website", "Instagram", "Facebook", "TikTok", "LinkedIn"].map((p) => (
                  <span key={p} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">
                    {p}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <AtSign size={15} /> Research my business with AI
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("name")}
              className="text-zinc-500 hover:text-zinc-300"
            >
              ← Back
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 3: Extracting ── */}
      {step === "extracting" && (
        <div className="text-center py-16 space-y-4">
          <Loader2 size={44} className="text-indigo-400 animate-spin mx-auto" />
          <div>
            <p className="text-white font-medium text-lg">{t("suite.new.analyzing")}</p>
            <p className="text-zinc-400 text-sm mt-2 transition-all">{extractLog}</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-xs text-zinc-600 mt-6">
            <span>🔍 Scraping your website &amp; social profiles</span>
            <span>🌐 Searching the web for more info</span>
            <span>🎨 Extracting colors, logo, services</span>
            <span>🤖 Building your brand profile with AI</span>
          </div>
        </div>
      )}

      {/* ── Step A: Business Name ── */}
      {step === "step-a" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>{t("suite.new.stepATitle")}</CardTitle>
              <CardDescription className="text-zinc-400">{t("suite.new.stepASubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white text-lg font-medium"
                dir="auto"
              />
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              await saveStep("a", { name: bizName });
              setStep("step-b");
            }} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <ChevronRight size={15} /> {t("suite.new.confirmName")}
            </Button>
            <button onClick={() => setStep("step-b")} className="text-zinc-500 text-sm hover:text-zinc-300">→</button>
          </div>
        </div>
      )}

      {/* ── Step B: Category / Niche ── */}
      {step === "step-b" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>{t("suite.new.stepBTitle")}</CardTitle>
              <CardDescription className="text-zinc-400">{t("suite.new.stepBSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {suggestions.niches.map((n, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedNicheIdx(idx); setShowNicheInput(false); setCustomNiche(""); }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedNicheIdx === idx
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                    dir="auto"
                  >{n}</button>
                ))}
                <button
                  onClick={() => { setShowNicheInput(true); setSelectedNicheIdx(-1); }}
                  className="px-3 py-1.5 rounded-full text-sm border border-dashed border-zinc-600 text-zinc-500 hover:border-zinc-400"
                >{t("suite.new.otherNiche")}</button>
              </div>
              {showNicheInput && (
                <Input
                  value={customNiche}
                  onChange={(e) => setCustomNiche(e.target.value)}
                  placeholder="Type your niche..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                  autoFocus
                />
              )}
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              const englishNiche = selectedNicheIdx >= 0 ? getEnglishNiche(selectedNicheIdx) : customNiche;
              const localNiche = selectedNicheIdx >= 0 ? suggestions.niches[selectedNicheIdx] : customNiche;
              if (englishNiche) await saveStep("b", { niche: localNiche, industry: englishNiche });
              setStep("step-c");
            }} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <ChevronRight size={15} /> {t("suite.new.confirmCategory")}
            </Button>
            <button onClick={() => setStep("step-c")} className="text-zinc-500 text-sm hover:text-zinc-300">→</button>
          </div>
        </div>
      )}

      {/* ── Step C: Audience Languages ── */}
      {step === "step-c" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>{t("suite.new.stepCTitle")}</CardTitle>
              <CardDescription className="text-zinc-400">
                {t("suite.new.stepCSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.filter((l) => !orderedLangs.includes(l.code)).map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setOrderedLangs((prev) => [...prev, l.code])}
                    dir={l.dir}
                    className="px-3 py-1.5 rounded-full text-sm border border-zinc-700 text-zinc-400 hover:border-indigo-500 hover:text-white transition-colors"
                  >{l.label}</button>
                ))}
              </div>
              {orderedLangs.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-zinc-500 text-xs">Selected order (main → secondary):</p>
                  {orderedLangs.map((code, idx) => {
                    const lang = LANGUAGES.find((l) => l.code === code);
                    return (
                      <div key={code} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2.5">
                        <span className="text-xs text-zinc-600 w-4 shrink-0">{idx + 1}</span>
                        <span className="text-white flex-1 text-sm" dir={lang?.dir}>{lang?.label}</span>
                        {idx === 0 && <span className="text-xs text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded">{t("suite.new.langMain")}</span>}
                        <button
                          onClick={() => setOrderedLangs((prev) => {
                            const arr = [...prev];
                            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                            return arr;
                          })}
                          disabled={idx === 0}
                          className="text-zinc-500 hover:text-white disabled:opacity-30 px-1"
                        >↑</button>
                        <button
                          onClick={() => setOrderedLangs((prev) => {
                            const arr = [...prev];
                            [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                            return arr;
                          })}
                          disabled={idx === orderedLangs.length - 1}
                          className="text-zinc-500 hover:text-white disabled:opacity-30 px-1"
                        >↓</button>
                        <button
                          onClick={() => setOrderedLangs((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-zinc-600 hover:text-red-400 px-1 transition-colors"
                        >✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              if (orderedLangs.length > 0) {
                await saveStep("c", {
                  audience_languages: orderedLangs,
                  dialect: LANG_TO_DIALECT[orderedLangs[0]] || "English",
                });
              }
              setStep("step-d");
            }} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <ChevronRight size={15} /> {t("suite.new.confirmLanguages")}
            </Button>
            <button onClick={() => setStep("step-d")} className="text-zinc-500 text-sm hover:text-zinc-300">→</button>
          </div>
        </div>
      )}

      {/* ── Step D: Products / Services ── */}
      {step === "step-d" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>{t("suite.new.stepDTitle")}</CardTitle>
              <CardDescription className="text-zinc-400">{t("suite.new.stepDSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {serviceItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={item}
                    onChange={(e) => setServiceItems((prev) => prev.map((s, idx) => idx === i ? e.target.value : s))}
                    className="flex-1 bg-zinc-800 border-zinc-700 text-white text-sm"
                    dir="auto"
                  />
                  <button
                    onClick={() => setServiceItems((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                  ><X size={14} /></button>
                </div>
              ))}
              {serviceItems.length === 0 && (
                <p className="text-zinc-500 text-sm">No services found. Add your first one below.</p>
              )}
              <button
                onClick={() => setServiceItems((prev) => [...prev, ""])}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
              ><Plus size={13} /> {t("suite.new.addService")}</button>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              const services = serviceItems.filter(Boolean);
              if (services.length > 0) await saveStep("d", { services });
              setStep("step-e");
            }} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <ChevronRight size={15} /> {t("suite.new.confirmServices")}
            </Button>
            <button onClick={() => setStep("step-e")} className="text-zinc-500 text-sm hover:text-zinc-300">→</button>
          </div>
        </div>
      )}

      {/* ── Step E: Audience ── */}
      {step === "step-e" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>{t("suite.new.stepETitle")}</CardTitle>
              <CardDescription className="text-zinc-400">{t("suite.new.stepESubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-zinc-300">{t("suite.new.location")}</Label>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_SCOPES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setLocationScope(value)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        locationScope === value
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}
                    >{label}</button>
                  ))}
                </div>
                {locationScope === "Custom" && (
                  <div className="space-y-2 mt-2">
                    <Input
                      value={customCountries}
                      onChange={(e) => setCustomCountries(e.target.value)}
                      placeholder="Countries (e.g. Israel, Palestine, Jordan)"
                      className="bg-zinc-800 border-zinc-700 text-white text-sm"
                    />
                    <Input
                      value={customCities}
                      onChange={(e) => setCustomCities(e.target.value)}
                      placeholder="Cities (optional, comma-separated)"
                      className="bg-zinc-800 border-zinc-700 text-white text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">{t("suite.new.interests")}</Label>
                <div className="flex flex-wrap gap-2">
                  {/* Suggested interests */}
                  {(suggestions.interests[suggestions.niches[selectedNicheIdx]] || suggestions.interests["default"]).map((interest) => (
                    <button
                      key={interest}
                      onClick={() => setSelectedInterests((prev) =>
                        prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
                      )}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selectedInterests.includes(interest)
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}
                      dir="auto"
                    >{interest}</button>
                  ))}
                  {/* Custom interests added by user */}
                  {selectedInterests
                    .filter((i) => !(suggestions.interests[suggestions.niches[selectedNicheIdx]] || suggestions.interests["default"]).includes(i))
                    .map((interest) => (
                      <button
                        key={interest}
                        onClick={() => setSelectedInterests((prev) => prev.filter((i) => i !== interest))}
                        className="px-3 py-1.5 rounded-full text-sm border bg-indigo-600 border-indigo-500 text-white flex items-center gap-1"
                        dir="auto"
                      >{interest} <X size={11} /></button>
                    ))
                  }
                </div>
                {/* Add custom interest */}
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add custom interest..."
                    className="bg-zinc-800 border-zinc-700 text-white text-sm flex-1"
                    dir="auto"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        const val = e.currentTarget.value.trim();
                        setSelectedInterests((prev) => prev.includes(val) ? prev : [...prev, val]);
                        e.currentTarget.value = "";
                        e.preventDefault();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="text-indigo-400 text-sm hover:text-indigo-300 px-2 flex items-center gap-1"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousSibling as HTMLInputElement);
                      const val = input?.value?.trim();
                      if (val) {
                        setSelectedInterests((prev) => prev.includes(val) ? prev : [...prev, val]);
                        input.value = "";
                      }
                    }}
                  ><Plus size={13} /> Add</button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              const countries = locationScope === "Custom"
                ? customCountries.split(",").map((c) => c.trim()).filter(Boolean)
                : locationScope === "Worldwide" ? [] : [locationScope];
              const cities = customCities.split(",").map((c) => c.trim()).filter(Boolean);
              // Auto-build target_audience text from structured data
              const locationText = locationScope === "Worldwide"
                ? "Worldwide"
                : [...countries, ...cities].join(", ") || locationScope;
              const interestsText = selectedInterests.length > 0
                ? `, interested in: ${selectedInterests.join(", ")}`
                : "";
              const targetAudience = `${locationText}${interestsText}`;
              await saveStep("e", {
                audience_location: { scope: locationScope === "Worldwide" ? "world" : "custom", countries, cities },
                audience_interests: selectedInterests,
                target_audience: targetAudience,
              });
              setStep("step-f");
            }} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <ChevronRight size={15} /> {t("suite.new.confirmAudience")}
            </Button>
            <button onClick={() => setStep("step-f")} className="text-zinc-500 text-sm hover:text-zinc-300">→</button>
          </div>
        </div>
      )}

      {/* ── Step F: Why Choose You ── */}
      {step === "step-f" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>{t("suite.new.stepFTitle")}</CardTitle>
              <CardDescription className="text-zinc-400" dir="auto">
                {t("suite.new.stepFSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-zinc-300">{t("suite.new.uspLabel")}</Label>
                {uspPoints.map((point, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={point}
                      onChange={(e) => setUspPoints((prev) => prev.map((p, idx) => idx === i ? e.target.value : p))}
                      className="flex-1 bg-zinc-800 border-zinc-700 text-white text-sm"
                      dir="auto"
                    />
                    <button onClick={() => setUspPoints((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-zinc-600 hover:text-red-400 transition-colors"><X size={14} /></button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {suggestions.usp.filter((s) => !uspPoints.includes(s)).map((s) => (
                    <button key={s} onClick={() => setUspPoints((prev) => [...prev, s])}
                      className="text-xs px-2 py-1 border border-zinc-700 text-zinc-500 rounded-full hover:border-indigo-500 hover:text-indigo-400 transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
                <button onClick={() => setUspPoints((prev) => [...prev, ""])}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm transition-colors mt-1">
                  <Plus size={13} /> {t("suite.new.addPoint")}
                </button>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">{t("suite.new.espLabel")}</Label>
                {espPoints.map((point, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={point}
                      onChange={(e) => setEspPoints((prev) => prev.map((p, idx) => idx === i ? e.target.value : p))}
                      className="flex-1 bg-zinc-800 border-zinc-700 text-white text-sm"
                      dir="auto"
                    />
                    <button onClick={() => setEspPoints((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-zinc-600 hover:text-red-400 transition-colors"><X size={14} /></button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {suggestions.esp.filter((s) => !espPoints.includes(s)).map((s) => (
                    <button key={s} onClick={() => setEspPoints((prev) => [...prev, s])}
                      className="text-xs px-2 py-1 border border-zinc-700 text-zinc-500 rounded-full hover:border-indigo-500 hover:text-indigo-400 transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
                <button onClick={() => setEspPoints((prev) => [...prev, ""])}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm transition-colors mt-1">
                  <Plus size={13} /> {t("suite.new.addPoint")}
                </button>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              const filteredUsp = uspPoints.filter(Boolean);
              const filteredEsp = espPoints.filter(Boolean);
              await saveStep("f", {
                usp_points: filteredUsp,
                esp_points: filteredEsp,
                unique_value: filteredUsp.join(". "),
                esp: filteredEsp.join(". "),
                how_they_help: filteredUsp[0] || brand?.how_they_help || "",
              });
              setStep("step-g");
            }} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <ChevronRight size={15} /> {t("suite.new.confirmWhyUs")}
            </Button>
            <button onClick={() => setStep("step-g")} className="text-zinc-500 text-sm hover:text-zinc-300">→</button>
          </div>
        </div>
      )}

      {/* ── Step G: Brand Assets ── */}
      {step === "step-g" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>{t("suite.new.stepGTitle")}</CardTitle>
              <CardDescription className="text-zinc-400">{t("suite.new.stepGSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* ── LOGO ── */}
              <div className="space-y-3">
                <Label className="text-zinc-300">{t("suite.new.logoLabel")}</Label>

                {/* Logo preview */}
                <div className="flex items-start gap-4">
                  {brand?.logo_url ? (
                    <div className="relative">
                      <img
                        src={brand.logo_url}
                        alt="logo"
                        className="h-24 w-24 object-contain bg-zinc-800 rounded-xl border border-zinc-700 p-2"
                      />
                      {brand.logo_source && (
                        <span className="absolute -top-1.5 -right-1.5 text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full">
                          {brand.logo_source === "ai-generated" ? "AI" : brand.logo_source === "uploaded" ? "↑" : "🔗"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="h-24 w-24 bg-zinc-800 rounded-xl border border-dashed border-zinc-600 flex items-center justify-center text-zinc-600 text-xs text-center p-2">
                      {t("suite.new.noLogoFound")}
                    </div>
                  )}
                  <div className="space-y-2 flex-1">
                    {/* Upload button */}
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer text-sm transition-colors w-full">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await uploadBrandAsset("logo", file);
                        }}
                      />
                      {uploadingAsset ? <Loader2 size={14} className="animate-spin" /> : null}
                      {t("suite.new.uploadLogo")}
                    </label>

                    {/* Logo style selector */}
                    <div className="space-y-1">
                      <p className="text-zinc-500 text-xs">{t("suite.new.aiStyle")}</p>
                      <div className="flex gap-2">
                        {(["icon_only", "with_name", "initials"] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => setLogoStyle(style)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                              logoStyle === style
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                            }`}
                          >
                            {style === "icon_only" ? t("suite.new.styleIconOnly") : style === "with_name" ? t("suite.new.styleWithName") : t("suite.new.styleInitials")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI generate */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateAssets(["logo"])}
                      disabled={generatingLogo}
                      className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-2 w-full"
                    >
                      {generatingLogo ? <Loader2 size={13} className="animate-spin" /> : null}
                      {t("suite.new.generateLogo")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── COLORS ── */}
              <div className="space-y-3">
                <Label className="text-zinc-300">{t("suite.new.colorsLabel")}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(["primary", "secondary", "accent"] as const).map((key) => (
                    <div key={key} className="space-y-1.5">
                      <p className="text-zinc-500 text-xs capitalize">{key}</p>
                      <div className="flex items-center gap-2">
                        <label className="relative cursor-pointer">
                          <input
                            type="color"
                            value={localColors[key]}
                            onChange={(e) => setLocalColors((prev) => ({ ...prev, [key]: e.target.value }))}
                            onBlur={saveColors}
                            className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer bg-transparent p-0.5"
                          />
                        </label>
                        <span className="text-xs text-zinc-400 font-mono">{localColors[key]}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAssets(["colors"])}
                  disabled={generatingColors}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-2"
                >
                  {generatingColors ? <Loader2 size={13} className="animate-spin" /> : null}
                  {t("suite.new.generateColors")}
                </Button>
              </div>

              {/* ── FONTS ── */}
              <div className="space-y-3">
                <Label className="text-zinc-300">{t("suite.new.fontsLabel")}</Label>

                {/* AI-suggested fonts */}
                {(brand?.font_suggestions || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(brand?.font_suggestions || []).map((f) => (
                      <span key={f} className="text-sm bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700">{f}</span>
                    ))}
                  </div>
                )}

                {/* Font upload per language */}
                <div className="space-y-2">
                  <p className="text-zinc-500 text-xs">{t("suite.new.uploadFontsPerLang")}</p>
                  {(orderedLangs.length > 0 ? orderedLangs : ["all"]).map((code) => {
                    const langName = code === "ar" ? "العربية" : code === "he" ? "עברית" : code === "en" ? "English" : code === "fr" ? "Français" : code === "es" ? "Español" : code === "tr" ? "Türkçe" : "All";
                    const uploadedFonts = (brand?.fonts_by_language?.[code] || brand?.fonts_by_language?.["all"] || []);
                    return (
                      <div key={code} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2">
                        <span className="text-zinc-300 text-sm w-20 shrink-0" dir={code === "ar" || code === "he" ? "rtl" : "ltr"}>{langName}</span>
                        <div className="flex-1 flex flex-wrap gap-1">
                          {uploadedFonts.map((font) => (
                            <span key={font.url} className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">{font.name}</span>
                          ))}
                          {uploadedFonts.length === 0 && <span className="text-zinc-600 text-xs">{t("suite.new.noFontUploaded")}</span>}
                        </div>
                        <label className="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0">
                          <input
                            type="file"
                            accept=".ttf,.otf,.woff,.woff2"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) await uploadBrandAsset("font", file, code);
                            }}
                          />
                          {uploadingAsset ? <Loader2 size={12} className="animate-spin inline" /> : t("suite.new.uploadFont")}
                        </label>
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAssets(["fonts"])}
                  disabled={generatingFonts}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-2"
                >
                  {generatingFonts ? <Loader2 size={13} className="animate-spin" /> : null}
                  {t("suite.new.generateFonts")}
                </Button>
              </div>

            </CardContent>
          </Card>

          <Button
            onClick={async () => {
              await saveStep("g", {
                colors: { primary: localColors.primary, secondary: localColors.secondary, accent: localColors.accent },
                logo_style: logoStyle,
              });
              setStep("strategy");
              await runGenerateStrategy();
            }}
            className="bg-indigo-600 hover:bg-indigo-500 gap-2 w-full"
          >
            <ChevronRight size={15} /> {t("suite.new.buildStrategy2")}
          </Button>
          <button
            onClick={async () => {
              setStep("strategy");
              await runGenerateStrategy();
            }}
            className="text-zinc-500 text-sm hover:text-zinc-300 w-full text-center"
          >
            {t("suite.new.skipBrand")}
          </button>
        </div>
      )}

      {/* ── Step 5: Generating Strategy ── */}
      {step === "strategy" && (
        <div className="text-center py-16 space-y-4">
          {strategyError ? (
            <div className="space-y-4">
              <div className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
                {strategyError}
              </div>
              <Button onClick={runGenerateStrategy} className="bg-indigo-600 hover:bg-indigo-500">
                {t("suite.new.tryAgain")}
              </Button>
            </div>
          ) : (
            <>
              <Loader2 size={44} className="text-indigo-400 animate-spin mx-auto" />
              <div>
                <p className="text-white font-medium text-lg">{t("suite.new.generatingStrategy")}</p>
                <p className="text-zinc-400 text-sm mt-2">Researching competitors, building audience profiles, generating your marketing message</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-xs text-zinc-600 mt-6">
                <span>🔍 Researching your competitors</span>
                <span>👥 Mapping your target audience</span>
                <span>💡 Generating 10 customer personas</span>
                <span>✍️ Writing your marketing message</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 6: Strategy Preview ── */}
      {step === "preview" && strategy && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>{t("suite.new.strategyReady")}</CardTitle>
              <CardDescription className="text-zinc-400">
                Your marketing message and full plan are saved. Access them anytime from the Strategy tab in your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-indigo-950/40 border border-indigo-800 rounded-lg p-4">
                <p className="text-indigo-300 text-xs font-medium mb-2 uppercase tracking-wide">Your marketing message</p>
                <p className="text-white text-sm leading-relaxed" dir="auto">{strategy.marketing_message}</p>
              </div>
              {(strategy.marketing_plan?.content_themes ?? []).length > 0 && (
                <div>
                  <p className="text-zinc-400 text-xs mb-2">Content themes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.marketing_plan.content_themes.map((theme) => (
                      <Badge key={theme} variant="outline" className="border-zinc-700 text-zinc-300 text-xs">{theme}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button
                onClick={() => { setStep("done"); setTimeout(() => router.push(`/suite/${suiteId}`), 800); }}
                className="bg-indigo-600 hover:bg-indigo-500 gap-2 w-full"
              >
                <CheckCircle2 size={14} /> {t("suite.new.goToDashboard")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 7: Done ── */}
      {step === "done" && (
        <div className="text-center py-20">
          <CheckCircle2 size={52} className="text-emerald-400 mx-auto mb-4" />
          <p className="text-white font-medium text-xl">Suite created!</p>
          <p className="text-zinc-400 text-sm mt-1">Redirecting to your dashboard…</p>
        </div>
      )}
    </div>
  );
}
