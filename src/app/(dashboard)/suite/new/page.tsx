"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Brand, MarketingStrategy } from "@/lib/api";
import { useT } from "@/lib/i18n/LanguageContext";
import { LANGUAGES, LangCode } from "@/lib/i18n/translations";
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

const COMMON_NICHES = [
  "Digital Marketing Agency", "E-commerce", "Restaurant & Food",
  "Fashion & Beauty", "Real Estate", "Health & Wellness",
  "Education & Training", "Technology & Software", "Travel & Tourism",
  "Photography & Media", "Legal Services", "Financial Services",
  "Retail & Shopping", "Construction & Real Estate",
];

const USP_SUGGESTIONS = [
  "Years of experience", "Competitive pricing", "Fast delivery",
  "Local expertise", "Personalized service", "Quality guarantee",
  "24/7 support", "Free consultation", "Proven results",
];

const ESP_SUGGESTIONS = [
  "Feel confident", "Save time", "Feel professional",
  "Peace of mind", "Feel proud of their brand", "In control",
  "Satisfied with results", "Stand out from competitors",
];

const INDUSTRY_INTERESTS: Record<string, string[]> = {
  "Digital Marketing Agency": ["Social media marketing", "Digital advertising", "Content creation", "SEO", "Branding"],
  "Restaurant & Food": ["Food & dining", "Cooking", "Local cuisine", "Healthy eating", "Restaurants"],
  "Fashion & Beauty": ["Fashion", "Beauty", "Lifestyle", "Shopping", "Style trends"],
  "Real Estate": ["Real estate", "Home improvement", "Interior design", "Investment", "Property"],
  "Health & Wellness": ["Health", "Fitness", "Nutrition", "Wellness", "Mental health"],
  "default": ["Business", "Entrepreneurship", "Social media", "Innovation", "Technology"],
};

const LANG_TO_DIALECT: Record<string, string> = {
  "ar": "Palestinian Arabic", "he": "Hebrew", "en": "English",
  "fr": "French", "es": "Spanish", "tr": "Turkish",
};

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "links", label: "Links" },
  { key: "extracting", label: "Analyzing" },
  { key: "step-a", label: "Business" },
  { key: "step-b", label: "Category" },
  { key: "step-c", label: "Languages" },
  { key: "step-d", label: "Services" },
  { key: "step-e", label: "Audience" },
  { key: "step-f", label: "Why Us" },
  { key: "step-g", label: "Brand" },
  { key: "strategy", label: "Strategy" },
  { key: "preview", label: "Preview" },
  { key: "done", label: "Done" },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
            i < idx ? "bg-indigo-600 text-white" : i === idx ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-500"
          }`}>
            {i < idx ? "✓" : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${i === idx ? "text-white" : "text-zinc-500"}`}>{s.label}</span>
          {i < STEPS.length - 1 && <div className="w-5 h-px bg-zinc-700" />}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewSuitePage() {
  const router = useRouter();
  const t = useT();
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
  const [selectedNiche, setSelectedNiche] = useState("");
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
  const [generatingAssets, setGeneratingAssets] = useState(false);

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
      setSelectedNiche(res.brand?.industry || "");
      setOrderedLangs(res.brand?.audience_languages || []);
      setServiceItems([...(res.brand?.services || []), ...(res.brand?.products || [])].filter(Boolean));
      setUspPoints(res.brand?.usp_points || (res.brand?.unique_value ? [res.brand.unique_value] : []));
      setEspPoints(res.brand?.esp_points || (res.brand?.esp ? [res.brand.esp] : []));
      setStep("step-a");
    } catch {
      clearTimeout(t1);
      clearTimeout(t2);
      setBizName(suiteName);
      setSelectedNiche("");
      setOrderedLangs([]);
      setServiceItems([]);
      setStep("step-a");
    }
  }

  async function runGenerateStrategy() {
    setStrategyError("");
    try {
      const res = await api.onboarding.generateStrategy({ suite_id: suiteId });
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
    setGeneratingAssets(true);
    try {
      const res = await api.onboarding.generateBrandAssets({ suite_id: suiteId, generate: types });
      setBrand(res.brand);
    } catch {
      // ignore
    } finally {
      setGeneratingAssets(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Create a new suite</h1>
        <p className="text-zinc-400 text-sm mt-1">We'll research your business and build your brand profile automatically</p>
      </div>

      <StepIndicator current={step} />

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
              <CardTitle>Your business name</CardTitle>
              <CardDescription className="text-zinc-400">Confirm or edit the name we found</CardDescription>
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
              <ChevronRight size={15} /> Confirm name
            </Button>
            <button onClick={() => setStep("step-b")} className="text-zinc-500 text-sm hover:text-zinc-300">Skip →</button>
          </div>
        </div>
      )}

      {/* ── Step B: Category / Niche ── */}
      {step === "step-b" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Business category</CardTitle>
              <CardDescription className="text-zinc-400">Select your niche or type your own</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[...new Set([selectedNiche, ...COMMON_NICHES].filter(Boolean))].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setSelectedNiche(n); setShowNicheInput(false); }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedNiche === n
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >{n}</button>
                ))}
                <button
                  onClick={() => setShowNicheInput(true)}
                  className="px-3 py-1.5 rounded-full text-sm border border-dashed border-zinc-600 text-zinc-500 hover:border-zinc-400"
                >+ Other</button>
              </div>
              {showNicheInput && (
                <Input
                  value={customNiche}
                  onChange={(e) => { setCustomNiche(e.target.value); setSelectedNiche(e.target.value); }}
                  placeholder="Type your niche..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                  autoFocus
                />
              )}
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              const niche = selectedNiche || customNiche;
              if (niche) await saveStep("b", { niche, industry: niche });
              setStep("step-c");
            }} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <ChevronRight size={15} /> Confirm category
            </Button>
            <button onClick={() => setStep("step-c")} className="text-zinc-500 text-sm hover:text-zinc-300">Skip →</button>
          </div>
        </div>
      )}

      {/* ── Step C: Audience Languages ── */}
      {step === "step-c" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Audience languages</CardTitle>
              <CardDescription className="text-zinc-400">
                Click to add languages. Drag ↑↓ to set priority — first is the main language.
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
                        {idx === 0 && <span className="text-xs text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded">Main</span>}
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
              <ChevronRight size={15} /> Confirm languages
            </Button>
            <button onClick={() => setStep("step-d")} className="text-zinc-500 text-sm hover:text-zinc-300">Skip →</button>
          </div>
        </div>
      )}

      {/* ── Step D: Products / Services ── */}
      {step === "step-d" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Products &amp; Services</CardTitle>
              <CardDescription className="text-zinc-400">Review and edit what we found. Add or remove items.</CardDescription>
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
              ><Plus size={13} /> Add product / service</button>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={async () => {
              const services = serviceItems.filter(Boolean);
              if (services.length > 0) await saveStep("d", { services });
              setStep("step-e");
            }} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <ChevronRight size={15} /> Confirm services
            </Button>
            <button onClick={() => setStep("step-e")} className="text-zinc-500 text-sm hover:text-zinc-300">Skip →</button>
          </div>
        </div>
      )}

      {/* ── Step E: Audience ── */}
      {step === "step-e" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Target audience</CardTitle>
              <CardDescription className="text-zinc-400">Where are your customers? What are their interests?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-zinc-300">Location</Label>
                <div className="flex flex-wrap gap-2">
                  {["Worldwide", "Middle East", "Europe", "North America", "Asia", "Custom"].map((scope) => (
                    <button
                      key={scope}
                      onClick={() => setLocationScope(scope)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        locationScope === scope
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}
                    >{scope}</button>
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
                <Label className="text-zinc-300">Interests &amp; habits</Label>
                <div className="flex flex-wrap gap-2">
                  {(INDUSTRY_INTERESTS[selectedNiche] || INDUSTRY_INTERESTS["default"]).map((interest) => (
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
                    >{interest}</button>
                  ))}
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
              await saveStep("e", {
                audience_location: { scope: locationScope === "Worldwide" ? "world" : "custom", countries, cities },
                audience_interests: selectedInterests,
              });
              setStep("step-f");
            }} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <ChevronRight size={15} /> Confirm audience
            </Button>
            <button onClick={() => setStep("step-f")} className="text-zinc-500 text-sm hover:text-zinc-300">Skip →</button>
          </div>
        </div>
      )}

      {/* ── Step F: Why Choose You ── */}
      {step === "step-f" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Why choose you?</CardTitle>
              <CardDescription className="text-zinc-400" dir="auto">
                لماذا يختارك العميل بشكل خاص ولا يختار منافس آخر؟
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-zinc-300">Your advantages (USP)</Label>
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
                  {USP_SUGGESTIONS.filter((s) => !uspPoints.includes(s)).map((s) => (
                    <button key={s} onClick={() => setUspPoints((prev) => [...prev, s])}
                      className="text-xs px-2 py-1 border border-zinc-700 text-zinc-500 rounded-full hover:border-indigo-500 hover:text-indigo-400 transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
                <button onClick={() => setUspPoints((prev) => [...prev, ""])}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm transition-colors mt-1">
                  <Plus size={13} /> Add point
                </button>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">How the client feels after (ESP)</Label>
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
                  {ESP_SUGGESTIONS.filter((s) => !espPoints.includes(s)).map((s) => (
                    <button key={s} onClick={() => setEspPoints((prev) => [...prev, s])}
                      className="text-xs px-2 py-1 border border-zinc-700 text-zinc-500 rounded-full hover:border-indigo-500 hover:text-indigo-400 transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
                <button onClick={() => setEspPoints((prev) => [...prev, ""])}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm transition-colors mt-1">
                  <Plus size={13} /> Add point
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
              <ChevronRight size={15} /> Confirm
            </Button>
            <button onClick={() => setStep("step-g")} className="text-zinc-500 text-sm hover:text-zinc-300">Skip →</button>
          </div>
        </div>
      )}

      {/* ── Step G: Brand Assets ── */}
      {step === "step-g" && (
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Your brand</CardTitle>
              <CardDescription className="text-zinc-400">
                Review what we found. Generate missing elements with AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Logo</Label>
                {brand?.logo_url ? (
                  <img src={brand.logo_url} alt="logo" className="h-24 object-contain bg-zinc-800 rounded-lg p-3" />
                ) : (
                  <div className="h-24 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 text-sm border border-dashed border-zinc-700">
                    No logo found
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAssets(["logo"])}
                  disabled={generatingAssets}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-2"
                >
                  {generatingAssets ? <Loader2 size={13} className="animate-spin" /> : null}
                  Generate logo with AI
                </Button>
              </div>
              {/* Colors */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Brand colors</Label>
                <div className="flex gap-4">
                  {(["primary", "secondary", "accent"] as const).map((key) => (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-lg border border-zinc-700"
                        style={{ backgroundColor: (brand?.colors as Record<string, string> | undefined)?.[key] || "#333" }}
                      />
                      <span className="text-xs text-zinc-500 capitalize">{key}</span>
                      <span className="text-xs text-zinc-500 font-mono">{brand?.colors?.[key] || "—"}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAssets(["colors"])}
                  disabled={generatingAssets}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-2"
                >
                  {generatingAssets ? <Loader2 size={13} className="animate-spin" /> : null}
                  Generate colors with AI
                </Button>
              </div>
              {/* Fonts */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Fonts</Label>
                {(brand?.font_suggestions || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(brand?.font_suggestions || []).map((f) => (
                      <span key={f} className="text-sm bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700">{f}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">No fonts detected</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAssets(["fonts"])}
                  disabled={generatingAssets}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-2"
                >
                  {generatingAssets ? <Loader2 size={13} className="animate-spin" /> : null}
                  Suggest fonts with AI
                </Button>
              </div>
            </CardContent>
          </Card>
          <Button
            onClick={async () => {
              await saveStep("g", {});
              setStep("strategy");
              await runGenerateStrategy();
            }}
            className="bg-indigo-600 hover:bg-indigo-500 gap-2 w-full"
          >
            <ChevronRight size={15} /> Build my marketing strategy
          </Button>
          <button onClick={async () => {
            setStep("strategy");
            await runGenerateStrategy();
          }} className="text-zinc-500 text-sm hover:text-zinc-300 w-full text-center">Skip brand →</button>
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
