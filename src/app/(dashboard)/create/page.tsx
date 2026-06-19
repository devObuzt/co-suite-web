"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Link from "next/link";
import { api, GenerateContentRequest, GenerationStatus, paymentGateDetail, PaymentGateDetail, Post } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, HelpCircle, ImageIcon, Layers, Loader2, Palette, Plus, Sparkles, UploadCloud, Video, Wand2, X } from "lucide-react";


type QuickAssetKind = "product" | "style" | "character" | "icon";

type QuickSavedAsset = {
  id: string;
  kind: QuickAssetKind | "logo";
  name: string;
  dataUrl: string;
  createdAt: string;
  url?: string;
  status?: "uploading" | "uploaded" | "failed" | "local";
  error?: string;
};

type QuickSizeOption = {
  id: string;
  label: string;
  helper: string;
  formats: ("image" | "video" | "carousel")[];
  aspectRatios: string[];
  note: string;
};

const QUICK_ASSET_KINDS: { id: QuickAssetKind; label: string; helper: string; multiple: boolean; instruction: string }[] = [
  { id: "product", label: "Product photos", helper: "Keep the product unchanged as much as possible.", multiple: true, instruction: "Use as product references. Preserve product shape, proportions, colors, packaging, and key details. Do not redesign the product." },
  { id: "style", label: "Similar style", helper: "A visual style or concept to follow.", multiple: false, instruction: "Use as style or concept reference only. Do not copy protected marks or exact layout." },
  { id: "character", label: "Character / element", helper: "A person, mascot, object, or element to use.", multiple: true, instruction: "Use these as character, presenter, object, or element references where relevant." },
  { id: "icon", label: "Icons", helper: "Icons or small visual elements for the design.", multiple: true, instruction: "Use as icon or supporting graphic references." },
];

const QUICK_SIZE_OPTIONS: QuickSizeOption[] = [
  { id: "image_all", label: "All image sizes", helper: "All supported image placements.", formats: ["image", "carousel"], aspectRatios: ["4:5", "1:1", "9:16", "16:9", "1.91:1"], note: "Generate image variants for Instagram, Meta, stories, wide, and Google Ads requirements." },
  { id: "instagram_post_4_5", label: "4:5 Instagram post", helper: "Portrait feed creative.", formats: ["image", "carousel"], aspectRatios: ["4:5"], note: "Optimize for Instagram feed portrait posts at 4:5." },
  { id: "meta_square_1_1", label: "1:1 Meta square ad", helper: "Square ad creative.", formats: ["image", "carousel"], aspectRatios: ["1:1"], note: "Optimize for Meta square ads at 1:1." },
  { id: "vertical_story_9_16", label: "9:16 vertical / story", helper: "Stories and vertical placements.", formats: ["image", "video"], aspectRatios: ["9:16"], note: "Optimize for vertical story placements at 9:16." },
  { id: "wide_16_9", label: "16:9 wide", helper: "Landscape placements.", formats: ["image", "video"], aspectRatios: ["16:9"], note: "Optimize for wide landscape placements at 16:9." },
  { id: "google_ads_all", label: "Google Ads image sizes", helper: "Google image ad requirements.", formats: ["image"], aspectRatios: ["1:1", "1.91:1", "4:5", "9:16", "16:9"], note: "Plan responsive Google Ads image assets and crops." },
  { id: "video_story_reel_9_16", label: "9:16 video / story / reel", helper: "Vertical reel or story video.", formats: ["video"], aspectRatios: ["9:16"], note: "Generate video for vertical reels and stories at 9:16." },
  { id: "video_wide_16_9", label: "16:9 video wide", helper: "Landscape video creative.", formats: ["video"], aspectRatios: ["16:9"], note: "Generate video for wide landscape placements at 16:9." },
];

function quickSizeMatchesContentType(option: QuickSizeOption, contentType?: "mixed" | "image" | "video" | "carousel") {
  if (!contentType || contentType === "mixed") return true;
  if (contentType === "carousel") return option.formats.includes("carousel") || option.formats.includes("image");
  return option.formats.includes(contentType);
}

function trimText(value: string, max: number) {
  return value.slice(0, max);
}

async function fileToSavedAsset(file: File, kind: QuickSavedAsset["kind"]): Promise<QuickSavedAsset> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    name: file.name,
    dataUrl,
    createdAt: new Date().toISOString(),
    status: "uploading",
  };
}

type ContentChoice = {
  label: string;
  content_type: GenerateContentRequest["content_type"];
  mode: GenerateContentRequest["mode"];
  icon: React.ReactNode;
};

const CHOICES: ContentChoice[] = [
  { label: "Quick post/ad", content_type: "mixed", mode: "quick", icon: <Sparkles size={16} /> },
  { label: "Create image", content_type: "image", mode: "image", icon: <ImageIcon size={16} /> },
  { label: "Create video", content_type: "video", mode: "video", icon: <Video size={16} /> },
  { label: "Carousel", content_type: "carousel", mode: "carousel", icon: <Layers size={16} /> },
];

export default function AccountCreatePage() {
  const { lang, dir } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [choice, setChoice] = useState<ContentChoice>(CHOICES[0]);
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState("");
  const [error, setError] = useState("");
  const [paymentGate, setPaymentGate] = useState<PaymentGateDetail | null>(null);
  const [quickOptionsOpen, setQuickOptionsOpen] = useState(true);
  const [logoEnabled, setLogoEnabled] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState("none");
  const [colorsEnabled, setColorsEnabled] = useState(false);
  const [briefColors, setBriefColors] = useState<string[]>(["#0a0a0a", "#2f80ff", "#ff4fa3"]);
  const [requiredSizes, setRequiredSizes] = useState<string[]>(["image_all"]);
  const [savedAssets, setSavedAssets] = useState<QuickSavedAsset[]>([]);
  const [assetUploadError, setAssetUploadError] = useState("");
  const [hook, setHook] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [terms, setTerms] = useState("");

  const isBusy = status?.status === "queued" || status?.status === "running" || status?.status === "retrying";
  const progress = Math.max(0, Math.min(100, status?.progress ?? 0));

  const placeholder = useMemo(() => {
    if (lang === "ar") return "مثال: اعمل منشور لصورة عن خدمة جديدة، بلغة واضحة ومريحة للعملاء.";
    if (lang === "he") return "לדוגמה: צור פוסט תמונה על שירות חדש, בשפה ברורה ונעימה ללקוחות.";
    return "Example: create a clear image post about a new service for customers.";
  }, [lang]);

  useEffect(() => {
    refreshPosts();
    api.content.accountGenerationStatus().then(setStatus).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isBusy) return;
    const timer = window.setInterval(async () => {
      const next = await api.content.accountGenerationStatus();
      setStatus(next);
      if (next.status === "completed" || next.status === "failed" || next.status === "waiting_provider_limit") {
        window.clearInterval(timer);
        refreshPosts();
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [isBusy]);

  async function refreshPosts() {
    setLoadingPosts(true);
    setPostsError("");
    try {
      setPosts(await api.content.listAccount());
    } catch (err) {
      setPostsError(err instanceof Error ? err.message : "Could not load recent generations.");
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }

  const quickOutputType = choice.mode === "quick" ? "mixed" : choice.content_type;
  const visibleSizeOptions = QUICK_SIZE_OPTIONS.filter((option) => quickSizeMatchesContentType(option, quickOutputType));
  const selectedSizeOptions = QUICK_SIZE_OPTIONS.filter((option) => requiredSizes.includes(option.id));
  const selectedAspectRatios = Array.from(new Set(selectedSizeOptions.flatMap((option) => option.aspectRatios)));
  const uploadedLogos = savedAssets.filter((asset) => asset.kind === "logo");
  const selectedLogoAsset = uploadedLogos.find((asset) => asset.id === selectedLogo);
  const referenceGroups = QUICK_ASSET_KINDS.map((kind) => ({ ...kind, assets: savedAssets.filter((asset) => asset.kind === kind.id) }));
  const quickAssetUploading = savedAssets.some((asset) => asset.status === "uploading");
  const quickAssetFailed = savedAssets.some((asset) => asset.status === "failed");
  const uploadedAssetCount = savedAssets.filter((asset) => asset.status === "uploaded" && asset.url).length;
  const quickCreateBlocked = choice.mode === "quick" && (quickAssetUploading || quickAssetFailed);

  async function addQuickAssets(files: FileList | null, kind: QuickSavedAsset["kind"]) {
    if (!files?.length) return;
    setAssetUploadError("");
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const entries = await Promise.all(imageFiles.map(async (file) => ({ file, asset: await fileToSavedAsset(file, kind) })));
    const next = entries.map((entry) => entry.asset);
    setSavedAssets((current) => [...current, ...next].slice(-40));
    if (kind === "logo" && next[0]) {
      setSelectedLogo(next[0].id);
      setLogoEnabled(true);
    }

    await Promise.all(entries.map(async ({ file, asset }) => {
      try {
        const uploaded = await api.content.uploadAccountQuickAsset(kind, file);
        setSavedAssets((current) => current.map((item) => item.id === asset.id ? {
          ...item,
          name: uploaded.name || item.name,
          url: uploaded.url,
          status: "uploaded",
          error: undefined,
        } : item));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setAssetUploadError(message);
        setSavedAssets((current) => current.map((item) => item.id === asset.id ? { ...item, status: "failed", error: message } : item));
      }
    }));
  }

  function removeQuickAsset(assetId: string) {
    setSavedAssets((current) => current.filter((asset) => asset.id !== assetId));
    if (selectedLogo === assetId) setSelectedLogo("none");
  }

  const quickCreativeBrief = {
    logo: selectedLogoAsset?.url
      ? { enabled: logoEnabled, source: "uploaded", name: selectedLogoAsset.name, url: selectedLogoAsset.url }
      : { enabled: logoEnabled, source: "none" },
    colors: { enabled: colorsEnabled, values: briefColors.filter(Boolean).slice(0, 3) },
    output_type: quickOutputType,
    required_sizes: {
      ids: selectedSizeOptions.map((option) => option.id),
      labels: selectedSizeOptions.map((option) => option.label),
      aspect_ratios: selectedAspectRatios,
      notes: selectedSizeOptions.map((option) => option.note),
    },
    reference_assets: referenceGroups
      .map((group) => ({ ...group, assets: group.assets.filter((asset) => asset.status === "uploaded" && asset.url) }))
      .filter((group) => group.assets.length > 0)
      .map((group) => ({
        kind: group.id,
        names: group.assets.map((asset) => asset.name),
        urls: group.assets.map((asset) => asset.url as string),
        count: group.assets.length,
        instruction: group.instruction,
      })),
    hook: hook.trim() || undefined,
    short_description: shortDescription.trim() || undefined,
    terms: terms.trim() || undefined,
    text_limits: {
      hook_max_chars: 30,
      hook_max_area_percent: 15,
      short_description_max_chars: 60,
      short_description_max_area_percent: 5,
      terms_max_chars: 25,
      terms_max_area_percent: 5,
      terms_max_font_px: 10,
    },
  };

  async function generate() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setError(lang === "ar" ? "اكتب شو بدك نولد أولًا." : lang === "he" ? "כתוב קודם מה תרצה שניצור." : "Write what you want to create first.");
      return;
    }
    setError("");
    setPaymentGate(null);
    try {
      const next = await api.content.generateAccount({
        count: 1,
        prompt: cleanPrompt,
        mode: choice.mode,
        content_type: choice.content_type,
        destination: "both",
        aspect_ratio: selectedAspectRatios.length === 1 ? selectedAspectRatios[0] : "Auto",
        model_tier: "auto",
        use_brand: false,
        language: lang,
        creative_brief: choice.mode === "quick" ? quickCreativeBrief : undefined,
      });
      setStatus(next);
    } catch (err) {
      const gate = paymentGateDetail(err);
      if (gate) {
        setPaymentGate(gate);
        setError(gate.message || "Generation tokens are exhausted.");
        return;
      }
      setError(err instanceof Error ? err.message : "Generation failed.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8" dir={dir}>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 border-blue-500/30 text-[color:var(--brand-accent-strong)] dark:text-blue-300">Account create</Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Create without a Suite</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Start generating before onboarding a business profile. Brand mode is off here; create a Suite when you want consistent business memory, brand assets, publishing, and analytics.
          </p>
        </div>
        <Link href="/suite/new">
          <Button variant="outline" className="gap-2">
            <Wand2 size={16} />
            Build a Suite
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-5">
        <Card className="os-surface rounded-xl">
          <CardHeader>
            <CardTitle>What should OneShare create?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {CHOICES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setChoice(item)}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-center text-sm font-medium transition-colors ${
                    choice.label === item.label
                      ? "os-mode-button-active"
                      : "os-mode-button"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={placeholder}
              dir="auto"
              className="min-h-44 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/20"
            />

            {choice.mode === "quick" && (
              <div className="space-y-3 rounded-xl border border-border bg-card/60 p-3">
                <button type="button" onClick={() => setQuickOptionsOpen((value) => !value)} className="flex w-full items-center justify-between text-sm font-medium text-foreground">
                  <span>Optional ad details</span>
                  <ChevronDown size={14} className={`transition-transform ${quickOptionsOpen ? "rotate-180" : ""}`} />
                </button>
                {quickOptionsOpen && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">Logo</span>
                          <button type="button" onClick={() => setLogoEnabled((value) => !value)} className={`rounded-full px-2 py-0.5 text-[11px] ${logoEnabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{logoEnabled ? "On" : "Off"}</button>
                        </div>
                        <div className="mt-2 grid gap-2">
                          <select value={selectedLogo} onChange={(event) => setSelectedLogo(event.target.value)} disabled={!logoEnabled} className="h-9 rounded-lg border border-input bg-card px-2 text-xs text-foreground outline-none disabled:opacity-50">
                            <option value="none">No logo yet</option>
                            {uploadedLogos.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                          </select>
                          <label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground hover:text-foreground">
                            <UploadCloud size={13} /> Upload logo
                            <input type="file" accept="image/*" className="hidden" onChange={(event) => addQuickAssets(event.target.files, "logo")} />
                          </label>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><Palette size={13} /> Colors</span>
                          <button type="button" onClick={() => setColorsEnabled((value) => !value)} className={`rounded-full px-2 py-0.5 text-[11px] ${colorsEnabled ? "bg-blue-500/10 text-blue-600 dark:text-blue-300" : "bg-muted text-muted-foreground"}`}>{colorsEnabled ? "On" : "Off"}</button>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {[0, 1, 2].map((index) => (
                            <input key={index} type="color" value={briefColors[index] || "#000000"} disabled={!colorsEnabled} onChange={(event) => setBriefColors((current) => { const next = [...current]; next[index] = event.target.value; return next; })} className="h-9 w-full rounded border border-input bg-card disabled:opacity-40" />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-foreground">Required size</span>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {visibleSizeOptions.map((option) => {
                          const active = requiredSizes.includes(option.id);
                          return (
                            <button key={option.id} type="button" onClick={() => setRequiredSizes((current) => {
                              const allIds = new Set(["image_all", "google_ads_all"]);
                              if (allIds.has(option.id)) return [option.id];
                              const withoutAll = current.filter((id) => !allIds.has(id));
                              const next = active ? withoutAll.filter((id) => id !== option.id) : [...withoutAll, option.id];
                              return next.length ? next : [option.id];
                            })} className={`min-h-14 rounded-lg border px-3 py-2 text-start transition-colors ${active ? "border-[color:var(--brand-accent)] bg-blue-500/10 text-[color:var(--brand-accent-strong)] dark:text-blue-300" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                              <span className="block text-xs font-semibold">{option.label}</span>
                              <span className="mt-1 block text-[11px] leading-relaxed opacity-80">{option.helper}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {referenceGroups.map((group) => (
                        <div key={group.id} className="rounded-lg border border-border bg-background p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-foreground">{group.label}</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{group.helper}</p>
                            </div>
                            <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground">
                              <Plus size={12} /> Add
                              <input type="file" accept="image/*" multiple={group.multiple} className="hidden" onChange={(event) => addQuickAssets(event.target.files, group.id)} />
                            </label>
                          </div>
                          {group.assets.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {group.assets.slice(-6).map((asset) => (
                                <span key={asset.id} className="group relative inline-flex h-12 w-12 overflow-hidden rounded-lg border border-border bg-card">
                                  <img src={asset.dataUrl} alt={asset.name} className="h-full w-full object-cover" />
                                  <span className={`absolute bottom-0.5 left-0.5 h-2 w-2 rounded-full ${asset.status === "uploaded" ? "bg-emerald-500" : asset.status === "failed" ? "bg-destructive" : "bg-amber-400"}`} />
                                  <button type="button" onClick={() => removeQuickAsset(asset.id)} className="absolute right-0.5 top-0.5 hidden h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground group-hover:flex"><X size={11} /></button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {(quickAssetUploading || quickAssetFailed || uploadedAssetCount > 0) && (
                      <div className={`rounded-lg border px-3 py-2 text-xs ${quickAssetFailed ? "border-destructive/40 bg-destructive/10 text-destructive" : quickAssetUploading ? "os-warning-panel" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
                        {quickAssetUploading && "Uploading reference assets before generation..."}
                        {quickAssetFailed && (assetUploadError || "Some reference assets failed to upload.")}
                        {!quickAssetUploading && !quickAssetFailed && `${uploadedAssetCount} reference asset${uploadedAssetCount === 1 ? "" : "s"} ready for generation.`}
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="space-y-1">
                        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">Hook · 30 chars <span title="Large text, max 15% of the image area."><HelpCircle size={12} /></span></span>
                        <input value={hook} maxLength={30} onChange={(event) => setHook(trimText(event.target.value, 30))} className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground outline-none" dir="auto" />
                        <span className="block text-end text-[10px] text-muted-foreground">{hook.length}/30</span>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Short text · 60 chars</span>
                        <input value={shortDescription} maxLength={60} onChange={(event) => setShortDescription(trimText(event.target.value, 60))} className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground outline-none" dir="auto" />
                        <span className="block text-end text-[10px] text-muted-foreground">{shortDescription.length}/60</span>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Terms · 25 chars</span>
                        <input value={terms} maxLength={25} onChange={(event) => setTerms(trimText(event.target.value, 25))} className="h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground outline-none" dir="auto" />
                        <span className="block text-end text-[10px] text-muted-foreground">{terms.length}/25</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="os-warning-panel rounded-xl px-4 py-3 text-sm">
              Brand mode is disabled until you build or open a Suite.
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
                {paymentGate && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/suite/new">
                      <Button size="sm" variant="outline">Upgrade plan</Button>
                    </Link>
                    <Link href="/suite/new">
                      <Button size="sm">Buy tokens</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            <Button onClick={generate} disabled={isBusy || quickCreateBlocked} title={quickCreateBlocked ? "Wait for uploads to finish or remove failed assets before creating." : undefined} className="w-full gap-2 sm:w-auto">
              {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isBusy ? "Generating..." : "Generate"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Generation status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={status?.status === "failed" ? "destructive" : "outline"}>
                {status?.status || "idle"}
              </Badge>
            </div>
            <div className="os-progress-track h-2 overflow-hidden rounded-full">
              <div className="os-progress-fill h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="min-h-10 text-sm text-muted-foreground" dir="auto">
              {status?.message || "No active generation. Write a prompt and start when ready."}
            </p>
            {(status?.status === "waiting_provider_limit" || status?.status === "waiting_capacity") && (
              <div className="os-warning-panel rounded-xl px-4 py-3 text-sm">
                Provider capacity is limited. This job is saved and will stay visible while it waits.
              </div>
            )}
            {status?.error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {status.error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Recent account generations</h2>
          <Button variant="ghost" size="sm" onClick={refreshPosts}>Refresh</Button>
        </div>
        {loadingPosts ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-56 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : postsError ? (
          <div className="os-warning-panel rounded-xl px-6 py-10 text-center text-sm">
            Could not load recent generations right now. The create form is still available when the API is connected.
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
            Generated content will appear here.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const firstMedia = post.media_urls?.[0];
  const isVideo = post.format === "video";
  return (
    <Card className="h-full">
      <div className="aspect-[4/3] bg-muted">
        {firstMedia ? (
          isVideo ? (
            <video src={firstMedia} className="h-full w-full object-cover" controls playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firstMedia} alt={post.topic || "Generated media"} className="h-full w-full object-cover" />
          )
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            {isVideo ? <Video size={32} /> : <ImageIcon size={32} />}
          </div>
        )}
      </div>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline">{post.format}</Badge>
          <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-medium text-foreground" dir="auto">{post.topic || "Generated post"}</h3>
        <p className="line-clamp-4 text-sm text-muted-foreground" dir="auto">{post.caption}</p>
        {post.hashtags?.length ? (
          <p className="line-clamp-1 text-xs text-primary">{post.hashtags.join(" ")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
