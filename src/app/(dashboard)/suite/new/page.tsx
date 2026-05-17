"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Brand, MarketingStrategy } from "@/lib/api";
import { useT } from "@/lib/i18n/LanguageContext";
import { LANGUAGES } from "@/lib/i18n/translations";
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

type Step = "name" | "links" | "extracting" | "complete" | "strategy" | "preview" | "done";

// ── Platform helpers ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "website",   label: "Website",   placeholder: "https://your-website.com",          hint: "Main website" },
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourpage",     hint: "Instagram profile" },
  { id: "facebook",  label: "Facebook",  placeholder: "https://facebook.com/yourpage",      hint: "Facebook page" },
  { id: "tiktok",    label: "TikTok",    placeholder: "https://tiktok.com/@yourhandle",     hint: "TikTok profile" },
  { id: "linkedin",  label: "LinkedIn",  placeholder: "https://linkedin.com/company/yours", hint: "LinkedIn company" },
  { id: "other",     label: "Other",     placeholder: "Any other relevant link",            hint: "Other link" },
];

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "links", label: "Links" },
  { key: "extracting", label: "Analyzing" },
  { key: "complete", label: "Profile" },
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
  const [completeData, setCompleteData] = useState({
    businessName: "",
    services: "",
    targetAudience: "",
    howTheyHelp: "",
    usp: "",
    esp: "",
    audienceLanguages: [] as string[],
  });
  const [strategy, setStrategy] = useState<MarketingStrategy | null>(null);
  const [strategyError, setStrategyError] = useState("");

  function toggleAudienceLang(code: string) {
    setCompleteData((d) => ({
      ...d,
      audienceLanguages: d.audienceLanguages.includes(code)
        ? d.audienceLanguages.filter((c) => c !== code)
        : [...d.audienceLanguages, code],
    }));
  }

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
      setCompleteData({
        businessName: res.brand?.name || suiteName,
        services: (res.brand?.services || []).join(", "),
        targetAudience: res.brand?.target_audience || "",
        howTheyHelp: res.brand?.how_they_help || "",
        usp: res.brand?.unique_value || "",
        esp: res.brand?.esp || "",
        audienceLanguages: res.brand?.audience_languages || [],
      });
      setStep("complete");
    } catch {
      clearTimeout(t1);
      clearTimeout(t2);
      setCompleteData({
        businessName: suiteName,
        services: "",
        targetAudience: "",
        howTheyHelp: "",
        usp: "",
        esp: "",
        audienceLanguages: [],
      });
      setStep("complete");
    }
  }

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const updatedBrand = {
      ...(brand || {}),
      name: completeData.businessName,
      services: completeData.services.split(",").map((s) => s.trim()).filter(Boolean),
      target_audience: completeData.targetAudience,
      how_they_help: completeData.howTheyHelp,
      unique_value: completeData.usp,
      esp: completeData.esp,
      audience_languages: completeData.audienceLanguages.length > 0
        ? completeData.audienceLanguages
        : ["ar"],
    };
    setBrand(updatedBrand);
    try {
      await api.onboarding.saveBrand({ suite_id: suiteId, brand: updatedBrand });
      setStep("strategy");
      await runGenerateStrategy();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
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
            <span>🔍 Scraping your website & social profiles</span>
            <span>🌐 Searching the web for more info</span>
            <span>🎨 Extracting colors, logo, services</span>
            <span>🤖 Building your brand profile with AI</span>
          </div>
        </div>
      )}

      {/* ── Step 4: Complete Profile ── */}
      {step === "complete" && (
        <form onSubmit={handleCompleteProfile} className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle>Complete your business profile</CardTitle>
              <CardDescription className="text-zinc-400">
                We need these details to build your marketing strategy. Pre-filled fields come from our research — review and correct them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">{t("suite.new.businessName")}</Label>
                <Input
                  value={completeData.businessName}
                  onChange={(e) => setCompleteData((d) => ({ ...d, businessName: e.target.value }))}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">{t("suite.new.services")}</Label>
                <Input
                  value={completeData.services}
                  onChange={(e) => setCompleteData((d) => ({ ...d, services: e.target.value }))}
                  placeholder="e.g. Social media management, Content creation, Ads"
                  required
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">{t("suite.new.audience")}</Label>
                <textarea
                  value={completeData.targetAudience}
                  onChange={(e) => setCompleteData((d) => ({ ...d, targetAudience: e.target.value }))}
                  placeholder="Who do you serve? Include location, age, profession, interests…"
                  required
                  rows={2}
                  dir="auto"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">{t("suite.new.howHelp")}</Label>
                <textarea
                  value={completeData.howTheyHelp}
                  onChange={(e) => setCompleteData((d) => ({ ...d, howTheyHelp: e.target.value }))}
                  placeholder="What problem do you solve? What outcome do you deliver?"
                  required
                  rows={2}
                  dir="auto"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">{t("suite.new.usp")}</Label>
                <Input
                  value={completeData.usp}
                  onChange={(e) => setCompleteData((d) => ({ ...d, usp: e.target.value }))}
                  placeholder="Your rational advantage over competitors"
                  required
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">{t("suite.new.esp")}</Label>
                <Input
                  value={completeData.esp}
                  onChange={(e) => setCompleteData((d) => ({ ...d, esp: e.target.value }))}
                  placeholder="e.g. They feel confident, in control, and proud of their brand"
                  required
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">{t("suite.new.audienceLanguages")}</Label>
                <p className="text-zinc-500 text-xs">{t("suite.new.audienceLanguagesDesc")}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => toggleAudienceLang(l.code)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        completeData.audienceLanguages.includes(l.code)
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-2.5">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </CardContent>
          </Card>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 gap-2">
            <ChevronRight size={15} /> {t("suite.new.buildStrategy")}
          </Button>
        </form>
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
                    {strategy.marketing_plan.content_themes.map((t) => (
                      <Badge key={t} variant="outline" className="border-zinc-700 text-zinc-300 text-xs">{t}</Badge>
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

      {/* ── Step 5: Done ── */}
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
