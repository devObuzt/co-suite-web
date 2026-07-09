"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Captions,
  Check,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Download,
  ImagePlus,
  Layers3,
  Link2,
  Loader2,
  Mic2,
  Music2,
  Play,
  Scissors,
  Sparkles,
  Trash2,
  Upload,
  X,
  XCircle,
  WandSparkles,
} from "lucide-react";
import { api, API_BASE, ApiError, BackgroundAssetItem, GenerationStatus } from "@/lib/api";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

type MontageOption = {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
};

type NotesAnalysisItem = {
  request?: string;
  detail?: string;
};

type VideoMontageResult = {
  rendered?: boolean;
  output_url?: string;
  package_url?: string;
  source_warning?: string;
  backgrounds_warning?: string;
  notes_analysis?: {
    honored?: NotesAnalysisItem[];
    unsupported?: NotesAnalysisItem[];
  };
  video_montage?: {
    source_url?: string;
    render?: {
      rendered?: boolean;
      output_url?: string;
      reason?: string;
      capabilities_applied?: string[];
      scenes?: Array<{
        id?: string;
        start?: number;
        end?: number;
        caption?: string;
        behindText?: string;
      }>;
    };
    package_url?: string;
    source_warning?: string;
  };
};

const options: MontageOption[] = [
  { id: "captions", label: "كابتشن وترجمة", desc: "نصوص واضحة فوق الفيديو حسب لغة الجمهور.", icon: <Captions size={18} /> },
  { id: "dead_spaces", label: "حذف الفراغات", desc: "قص السكتات والمقاطع الضعيفة لتحسين الإيقاع.", icon: <Scissors size={18} /> },
  { id: "background", label: "إزالة الخلفية", desc: "عزل الشخص أو المنتج عند الحاجة.", icon: <WandSparkles size={18} /> },
  { id: "titles", label: "عناوين 3D", desc: "افتتاحيات وعناوين قصيرة تجذب الانتباه.", icon: <Layers3 size={18} /> },
  { id: "music", label: "موسيقى ومؤثرات", desc: "إضافة موسيقى خفيفة ومؤثرات انتقال مناسبة.", icon: <Music2 size={18} /> },
  { id: "voice_cleanup", label: "تنظيف الصوت", desc: "تحسين الكلام وتقليل الضجيج قدر الإمكان.", icon: <Mic2 size={18} /> },
];

function absoluteApiUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE.replace(/\/api\/v1$/, "")}${path}`;
}

function extractVideoMontageResult(status: GenerationStatus | null): VideoMontageResult | null {
  if (!status?.result || typeof status.result !== "object") return null;
  return status.result as VideoMontageResult;
}

type JobDisplayState = "queued" | "running" | "completed" | "failed";

function jobDisplayState(job: GenerationStatus): JobDisplayState {
  if (job.status === "completed") return "completed";
  if (job.status === "failed" || job.status === "cancelled" || job.status === "timeout") return "failed";
  if (job.status === "running") return "running";
  return "queued";
}

const jobChips: Record<JobDisplayState, { label: string; className: string }> = {
  queued: { label: "بالطابور", className: "bg-[#f8d84a]/18 text-[#9a6b00]" },
  running: { label: "قيد الرندر", className: "bg-[#2f80ff]/12 text-[#2f80ff]" },
  completed: { label: "جاهز", className: "bg-[#18b89d]/12 text-[#087966]" },
  failed: { label: "فشل", className: "bg-red-500/12 text-red-600" },
};

function jobSourceLabel(job: GenerationStatus): { label: string; href: string | null } {
  const fileName = job.input?.source_file_name;
  if (fileName) return { label: fileName, href: null };
  const result = extractVideoMontageResult(job);
  const url = job.input?.source_url || result?.video_montage?.source_url || "";
  if (!url) return { label: "بدون مصدر", href: null };
  try {
    const parsed = new URL(url);
    const tail = parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname;
    return { label: decodeURIComponent(tail).slice(0, 60) || parsed.hostname, href: url };
  } catch {
    return { label: url.slice(0, 60), href: url };
  }
}

function formatJobTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function VideoMontagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(options.map((option) => option.id));
  const [notes, setNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [stagedUrl, setStagedUrl] = useState("");
  const [staging, setStaging] = useState(false);
  const [stageFailedUrl, setStageFailedUrl] = useState("");
  const [captionOverrides, setCaptionOverrides] = useState<string[]>([]);
  const [titleOverrides, setTitleOverrides] = useState<string[]>([]);
  const [jobs, setJobs] = useState<GenerationStatus[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backgrounds, setBackgrounds] = useState<BackgroundAssetItem[]>([]);
  const [backgroundsMode, setBackgroundsMode] = useState<"blend" | "user_only">("blend");
  // Uploads are a library: only ids explicitly selected here apply to THIS job.
  const [selectedBackgroundIds, setSelectedBackgroundIds] = useState<string[]>([]);
  const [backgroundsPickerOpen, setBackgroundsPickerOpen] = useState(false);
  const [uploadingBackgrounds, setUploadingBackgrounds] = useState(false);
  const [backgroundsNotice, setBackgroundsNotice] = useState<string | null>(null);
  const backgroundsInputRef = useRef<HTMLInputElement | null>(null);

  const refreshBackgrounds = useCallback(async () => {
    try {
      const res = await api.media.listBackgrounds(id);
      setBackgrounds(res.assets || []);
    } catch {
      // Non-blocking: the montage form still works without the strip.
    }
  }, [id]);

  useEffect(() => {
    void refreshBackgrounds();
  }, [refreshBackgrounds]);

  const selectedBackgrounds = useMemo(
    () =>
      selectedBackgroundIds
        .map((assetId) => backgrounds.find((asset) => asset.id === assetId))
        .filter((asset): asset is BackgroundAssetItem => !!asset),
    [backgrounds, selectedBackgroundIds],
  );

  function toggleBackgroundSelection(assetId: string) {
    setSelectedBackgroundIds((current) =>
      current.includes(assetId)
        ? current.filter((item) => item !== assetId)
        : [...current, assetId].slice(0, 20),
    );
  }

  async function uploadBackgroundFiles(fileList: FileList | null) {
    const files = Array.from(fileList || []).slice(0, 10);
    if (!files.length || uploadingBackgrounds) return;
    setUploadingBackgrounds(true);
    setBackgroundsNotice(null);
    try {
      const res = await api.media.uploadBackgrounds(id, files);
      const fresh = res.assets || [];
      setBackgrounds((current) => [...fresh, ...current]);
      // Freshly uploaded backgrounds are auto-selected for this job.
      setSelectedBackgroundIds((current) =>
        [...current, ...fresh.map((asset) => asset.id).filter((assetId) => !current.includes(assetId))].slice(0, 20),
      );
      if (res.warnings?.length) setBackgroundsNotice(res.warnings.join(" • "));
    } catch (err) {
      setBackgroundsNotice(err instanceof Error ? err.message : "تعذر رفع الخلفيات.");
    } finally {
      setUploadingBackgrounds(false);
      if (backgroundsInputRef.current) backgroundsInputRef.current.value = "";
    }
  }

  async function deleteBackground(assetId: string) {
    try {
      await api.media.deleteBackground(id, assetId);
      setBackgrounds((current) => current.filter((asset) => asset.id !== assetId));
      setSelectedBackgroundIds((current) => current.filter((item) => item !== assetId));
    } catch (err) {
      setBackgroundsNotice(err instanceof Error ? err.message : "تعذر حذف الخلفية.");
    }
  }

  const preview = useMemo(() => {
    if (sourceFile) return { kind: "video" as const, src: URL.createObjectURL(sourceFile) };
    if (stagedUrl) return { kind: "video" as const, src: stagedUrl };
    const url = sourceUrl.trim();
    const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|uc\?[^ ]*id=)([\w-]+)/);
    // Browsers can't play uc?export=download (Google returns HTML), so embed
    // Drive's own preview player and scale/offset the whole frame instead.
    if (driveMatch) return { kind: "drive" as const, src: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
    if (/^https?:\/\/.+\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url)) return { kind: "video" as const, src: url };
    return null;
  }, [sourceFile, sourceUrl, stagedUrl]);
  const previewDragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    previewDragRef.current = { x: offsetX, y: offsetY, startX: event.clientX, startY: event.clientY };
  };
  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = previewDragRef.current;
    if (!drag) return;
    const box = event.currentTarget.getBoundingClientRect();
    setOffsetX(Math.max(-40, Math.min(40, drag.x + ((event.clientX - drag.startX) / box.width) * 100)));
    setOffsetY(Math.max(-40, Math.min(40, drag.y + ((event.clientY - drag.startY) / box.height) * 100)));
  };
  const handlePreviewPointerUp = () => {
    previewDragRef.current = null;
  };
  const handleStagePreview = async () => {
    const url = sourceUrl.trim();
    if (!url || staging) return;
    setStaging(true);
    setError(null);
    try {
      const res = await api.videoMontage.stageSource(id, url);
      setStagedUrl(res.staged_url);
    } catch (err) {
      setStageFailedUrl(url);
      setError(err instanceof Error ? err.message : "تعذر تجهيز المعاينة.");
    } finally {
      setStaging(false);
    }
  };
  const subjectTransform = `translate(${offsetX}%, ${offsetY}%) scale(${zoom})`;
  useEffect(() => {
    const url = sourceUrl.trim();
    const isDrive = /drive\.google\.com\/(?:file\/d\/|uc\?[^ ]*id=)/.test(url);
    if (!sourceFile && !stagedUrl && !staging && isDrive && url !== stageFailedUrl) {
      const timer = setTimeout(() => {
        void handleStagePreview();
      }, 800);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl, sourceFile, stagedUrl, staging, stageFailedUrl]);

  const anyActive = jobs.some((job) => job.is_active);
  const latestScenesJob = useMemo(
    () => jobs.find((job) => (extractVideoMontageResult(job)?.video_montage?.render?.scenes || []).length > 0) || null,
    [jobs],
  );
  const renderedScenes = extractVideoMontageResult(latestScenesJob)?.video_montage?.render?.scenes || [];
  const latestSourceUrl = extractVideoMontageResult(latestScenesJob)?.video_montage?.source_url || "";
  const effectiveSourceUrl = sourceUrl.trim() || latestSourceUrl;

  const refreshJobs = useCallback(async () => {
    try {
      const res = await api.videoMontage.list(id, 10);
      setJobs(res.jobs || []);
    } catch {
      // Keep the previous list on transient polling errors.
    } finally {
      setLoadingJobs(false);
    }
  }, [id]);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  useEffect(() => {
    if (!anyActive) return;
    const interval = window.setInterval(() => {
      void refreshJobs();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [anyActive, refreshJobs]);


  function toggleOption(optionId: string) {
    setSelectedOptions((current) => (
      current.includes(optionId)
        ? current.filter((item) => item !== optionId)
        : [...current, optionId]
    ));
  }

  function resetForm() {
    setSourceFile(null);
    setSourceUrl("");
    setStagedUrl("");
    setStageFailedUrl("");
    setNotes("");
    setCaptionOverrides([]);
    setTitleOverrides([]);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    // Selection is per-job: the next video starts with a clean slate.
    setSelectedBackgroundIds([]);
    setBackgroundsPickerOpen(false);
    setBackgroundsMode("blend");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function startMontage() {
    setError(null);
    if (!sourceFile && !effectiveSourceUrl) {
      setError("ارفع ملف فيديو أو ضع رابط مباشر للفيديو قبل تشغيل المونتاج.");
      return;
    }
    setSubmitting(true);
    try {
      const next = await api.videoMontage.create(id, {
        mode: "talking_head",
        sourceUrl: sourceFile ? "" : stagedUrl || effectiveSourceUrl,
        options: selectedOptions,
        notes,
        sourceFile,
        captionOverrides,
        titleOverrides,
        zoom,
        offsetX,
        offsetY,
        // The mode only matters with a non-empty selection; without one the
        // render is generated-only anyway, so always send the default.
        backgroundsMode: selectedBackgroundIds.length > 0 ? backgroundsMode : "blend",
        backgroundAssetIds: selectedBackgroundIds,
      });
      // Show the fresh job immediately, then let the list poll take over —
      // and clear the form so the next video can queue right away.
      setJobs((current) => [next, ...current.filter((job) => job.job_id !== next.job_id)].slice(0, 10));
      resetForm();
      void refreshJobs();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : "تعذر تشغيل المونتاج.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SuitePageShell title="التوليد والإنشاء" description="" backHref={`/suite/${id}`}>
      <section className="space-y-5" dir="rtl">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-muted-foreground">مونتاج الفيديوهات</p>
          <div className="relative overflow-hidden rounded-3xl border border-[#2f80ff]/25 bg-card p-5 shadow-sm sm:p-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#2f80ff]/18 via-[#18b89d]/10 to-transparent" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#18b89d]/25 bg-[#18b89d]/10 px-3 py-1 text-xs font-bold text-[#087966]">
                  <BadgeCheck size={14} />
                  شخص يتحدث للكاميرا
                </div>
                <h1 className="os-text-wrap text-3xl font-black leading-tight text-foreground sm:text-4xl">
                  مونتاج فيديوهات جاهز للمراجعة
                </h1>
                <p className="os-text-wrap max-w-2xl text-sm leading-7 text-muted-foreground">
                  ارفع ملف فيديو أو ضع رابط مباشر، واختر ستايل المونتاج. فيك تضيف أكثر من فيديو للطابور — كل واحد بيترندر بدوره وبتتابع حالته تحت.
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2f80ff]/12 text-[#2f80ff]">
                <Clapperboard size={28} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">الملفات والمصدر</p>
                <h2 className="mt-1 text-2xl font-black text-foreground">فيديو المتحدث</h2>
              </div>
              <Upload className="text-[#2f80ff]" size={24} />
            </div>
            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#2f80ff]/35 bg-[#2f80ff]/5 p-5 text-center transition hover:border-[#2f80ff]">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(event) => {
                  setSourceFile(event.target.files?.[0] || null);
                  setStagedUrl("");
                  setCaptionOverrides([]);
                  setTitleOverrides([]);
                }}
              />
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-[#2f80ff] shadow-sm">
                <Upload size={22} />
              </div>
              <p className="mt-3 text-sm font-bold text-foreground">
                {sourceFile ? sourceFile.name : "ارفع فيديو للتجربة"}
              </p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
                الأفضل الآن رفع ملف مباشر. روابط Google Drive تعمل فقط إذا كانت قابلة للتحميل مباشرة.
              </p>
            </label>
            <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="video-link">
              أو رابط ملف فيديو مباشر
            </label>
            <div className="mt-2 flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2">
              <Link2 size={18} className="shrink-0 text-muted-foreground" />
              <input
                id="video-link"
                value={sourceUrl}
                onChange={(event) => {
                  setSourceUrl(event.target.value);
                  setStagedUrl("");
                  setStageFailedUrl("");
                  setCaptionOverrides([]);
                  setTitleOverrides([]);
                }}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={latestSourceUrl || "https://example.com/video.mp4"}
                dir="ltr"
              />
            </div>
            <div className="mt-5 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground" htmlFor="montage-zoom">
                  زوم على الشخصية
                </label>
                <span className="rounded-lg bg-[#2f80ff]/10 px-2.5 py-1 text-sm font-bold text-[#2f80ff]" dir="ltr">
                  {zoom.toFixed(2)}x
                </span>
              </div>
              <input
                id="montage-zoom"
                type="range"
                min={1}
                max={3}
                step={0.25}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="mt-3 w-full accent-[#2f80ff]"
                dir="ltr"
              />
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground" dir="ltr">
                <span>1x</span>
                <span>1.5x</span>
                <span>2x</span>
                <span>2.5x</span>
                <span>3x</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                الزوم مثبّت على مستوى الوجه — بيقصّ الأسفل والجوانب (مفيد لإخفاء أجسام أسفل الكادر) مع الحفاظ على الرأس.
              </p>
              {preview ? (
                <>
                  <div
                    className="mx-auto mt-4 aspect-[9/16] w-48 touch-none cursor-grab overflow-hidden rounded-xl border border-border bg-black active:cursor-grabbing"
                    onPointerDown={handlePreviewPointerDown}
                    onPointerMove={handlePreviewPointerMove}
                    onPointerUp={handlePreviewPointerUp}
                    onPointerCancel={handlePreviewPointerUp}
                  >
                    {preview.kind === "video" ? (
                      <video
                        key={preview.src}
                        src={preview.src}
                        muted
                        loop
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                        style={{ transform: subjectTransform, transformOrigin: "50% 25%" }}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-black/85 p-4 text-center">
                        <span className={`h-8 w-8 rounded-full border-2 border-[#2f80ff] border-t-transparent ${staging ? "animate-spin" : "opacity-40"}`} />
                        <p className="text-xs leading-5 text-white/80">
                          {staging
                            ? "عم نجهز معاينة دقيقة من الرابط… بتاخد لحد دقيقة"
                            : stageFailedUrl
                              ? "ما قدرنا نجيب الفيديو من هالرابط — جرّب إعادة المحاولة، أو ارفع الملف مباشرة (أضمن)."
                              : "المعاينة الدقيقة رح تتجهز تلقائيًا…"}
                        </p>
                      </div>
                    )}
                  </div>
                  {preview.kind === "drive" && !staging ? (
                    <button
                      type="button"
                      onClick={handleStagePreview}
                      className="mx-auto mt-3 block rounded-xl bg-[#2f80ff] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2568cc]"
                    >
                      إعادة محاولة تجهيز المعاينة
                    </button>
                  ) : null}
                  <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground" dir="ltr">
                    <span>X: {offsetX.toFixed(0)}%</span>
                    <span>Y: {offsetY.toFixed(0)}%</span>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-2 py-0.5 font-semibold text-foreground transition hover:border-[#2f80ff]"
                      onClick={() => {
                        setOffsetX(0);
                        setOffsetY(0);
                      }}
                    >
                      تصفير
                    </button>
                  </div>
                  <p className="mt-1 text-center text-xs text-muted-foreground">
                    اسحب المعاينة لتحريك وضعية الشخصية (يمين/شمال/فوق/تحت) — الوضعية والزوم بينطبقوا على المونتاج النهائي.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  ارفع فيديو أو حط رابط حتى تشوف معاينة الزوم مباشرة.
                </p>
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-foreground">خلفياتي</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    مكتبتك الخاصة من الصور والفيديوهات — بس الخلفيات يلي بتختارها هون بتدخل بهالفيديو تحديدًا.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBackgroundsPickerOpen((open) => !open)}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-[#2f80ff]/35 bg-[#2f80ff]/8 px-3 text-xs font-black text-[#2f80ff] transition hover:border-[#2f80ff]"
                >
                  <ImagePlus size={15} />
                  {backgroundsPickerOpen ? "إغلاق" : "رفع خلفيات"}
                </button>
              </div>
              {backgroundsNotice && (
                <p className="os-text-wrap mt-2 rounded-xl border border-[#f8d84a]/40 bg-[#f8d84a]/10 p-2 text-xs leading-5 text-[#9a6b00]">
                  {backgroundsNotice}
                </p>
              )}
              {selectedBackgrounds.length > 0 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1" dir="ltr">
                  {selectedBackgrounds.map((asset) => (
                    <div key={asset.id} className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-[#18b89d]/45 bg-black">
                      {asset.kind === "visual_video" ? (
                        <video src={asset.storage_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.storage_url} alt={asset.title} className="h-full w-full object-cover" />
                      )}
                      {asset.kind === "visual_video" && (
                        <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white">فيديو</span>
                      )}
                      <button
                        type="button"
                        aria-label="إلغاء اختيار الخلفية"
                        onClick={() => toggleBackgroundSelection(asset.id)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-lg bg-black/60 text-white transition hover:bg-black/80"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-xs leading-5 text-muted-foreground">
                  ما في خلفيات مختارة لهالفيديو — الخلفيات رح تكون مولّدة تلقائيًا.
                </p>
              )}
              {backgroundsPickerOpen && (
                <div className="mt-3 rounded-2xl border border-[#2f80ff]/25 bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black text-foreground">اختر من مكتبتك أو ارفع جديد</p>
                    <div className="flex items-center gap-2">
                      <label className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-[#2f80ff]/35 bg-[#2f80ff]/8 px-3 text-xs font-black text-[#2f80ff] transition hover:border-[#2f80ff] ${uploadingBackgrounds ? "pointer-events-none opacity-60" : ""}`}>
                        <input
                          ref={backgroundsInputRef}
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="sr-only"
                          onChange={(event) => void uploadBackgroundFiles(event.target.files)}
                        />
                        {uploadingBackgrounds ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploadingBackgrounds ? "عم نرفع ونحلل..." : "رفع ملفات جديدة"}
                      </label>
                      <button
                        type="button"
                        onClick={() => setBackgroundsPickerOpen(false)}
                        className="inline-flex min-h-9 items-center rounded-xl bg-foreground px-4 text-xs font-black text-background"
                      >
                        تم
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    الملفات الجديدة بتنضاف للمكتبة وبتنختار تلقائيًا لهالفيديو. اضغط على أي خلفية لاختيارها أو إلغائها.
                  </p>
                  {backgrounds.length > 0 ? (
                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5" dir="ltr">
                      {backgrounds.map((asset) => {
                        const selected = selectedBackgroundIds.includes(asset.id);
                        return (
                          <div key={asset.id} className="group relative">
                            <button
                              type="button"
                              onClick={() => toggleBackgroundSelection(asset.id)}
                              aria-pressed={selected}
                              aria-label={selected ? "إلغاء اختيار الخلفية" : "اختيار الخلفية"}
                              className={`relative block aspect-[2/3] w-full overflow-hidden rounded-xl border-2 bg-black transition ${
                                selected ? "border-[#18b89d]" : "border-transparent hover:border-[#2f80ff]/45"
                              }`}
                            >
                              {asset.kind === "visual_video" ? (
                                <video src={asset.storage_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={asset.storage_url} alt={asset.title} className="h-full w-full object-cover" />
                              )}
                              {asset.kind === "visual_video" && (
                                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white">فيديو</span>
                              )}
                              <span
                                className={`absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-lg transition ${
                                  selected ? "bg-[#18b89d] text-white" : "bg-black/50 text-white/60"
                                }`}
                              >
                                <Check size={13} />
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label="حذف الخلفية من المكتبة"
                              onClick={() => void deleteBackground(asset.id)}
                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-lg bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-center text-xs leading-5 text-muted-foreground">
                      المكتبة فاضية بعد — ارفع أول صورة أو فيديو من زر &quot;رفع ملفات جديدة&quot;.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBackgroundsMode("blend")}
                  disabled={selectedBackgroundIds.length === 0}
                  className={`min-h-10 rounded-xl border px-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    backgroundsMode === "blend"
                      ? "border-[#18b89d]/45 bg-[#18b89d]/10 text-[#087966]"
                      : "border-border bg-card text-muted-foreground hover:border-[#18b89d]/35"
                  }`}
                >
                  امزج مع المولّد (افتراضي)
                </button>
                <button
                  type="button"
                  onClick={() => setBackgroundsMode("user_only")}
                  disabled={selectedBackgroundIds.length === 0}
                  className={`min-h-10 rounded-xl border px-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    backgroundsMode === "user_only"
                      ? "border-[#18b89d]/45 bg-[#18b89d]/10 text-[#087966]"
                      : "border-border bg-card text-muted-foreground hover:border-[#18b89d]/35"
                  }`}
                >
                  خلفياتي فقط
                </button>
              </div>
              {selectedBackgroundIds.length === 0 && (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  خيارات المزج بتتفعّل بس تختار خلفيات لهالفيديو.
                </p>
              )}
            </div>
            <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="montage-notes">
              ملاحظات المونتاج
            </label>
            <textarea
              id="montage-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-border bg-background p-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-[#2f80ff]"
              placeholder="مثال: فيديو سريع، كابتشن عربي، افتح بعنوان قوي، لا تستخدم موسيقى صاخبة..."
            />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              ملاحظاتك بتنحلل تلقائيًا: يلي منقدر نطبّقه بينفّذ فعليًا، ويلي مش مدعوم بينذكر بوضوح بنتيجة كل Job.
            </p>
          </article>

          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">ستايل المونتاج</p>
                <h2 className="mt-1 text-2xl font-black text-foreground">الخيارات المطلوبة</h2>
              </div>
              <Sparkles className="text-[#ff4fa3]" size={24} />
            </div>
            <div className="mt-5 grid gap-2">
              {options.map((option) => {
                const selected = selectedOptions.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-right transition ${
                      selected
                        ? "border-[#18b89d]/45 bg-[#18b89d]/10"
                        : "border-border bg-background hover:border-[#18b89d]/35"
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-[#18b89d] text-white" : "bg-muted text-muted-foreground"}`}>
                      {option.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-foreground">{option.label}</span>
                      <span className="os-text-wrap mt-1 block text-xs leading-5 text-muted-foreground">{option.desc}</span>
                    </span>
                    {selected && <CheckCircle2 size={18} className="shrink-0 text-[#18b89d]" />}
                  </button>
                );
              })}
            </div>
          </article>
        </div>

        <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">طابور الرندر</p>
              <h2 className="mt-1 text-2xl font-black text-foreground">آخر الفيديوهات</h2>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f8d84a]/18 px-3 py-1 text-xs font-bold text-[#9a6b00]">
              <Clock3 size={14} />
              {loadingJobs ? "نفحص الطابور" : anyActive ? "في فيديوهات قيد الشغل" : "جاهز للتشغيل"}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startMontage}
              disabled={submitting}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-foreground px-5 text-sm font-black text-background transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {submitting ? "عم نضيف للطابور..." : "تشغيل المونتاج"}
            </button>
            <Link
              href={`/suite/${id}/create`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 text-sm font-black text-foreground transition hover:bg-muted"
            >
              <Sparkles size={18} />
              رجوع لإنشاء جديد
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {jobs.length === 0 && !loadingJobs && (
              <p className="rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                ما في أي مونتاج بعد — ارفع أول فيديو وشغّل المونتاج.
              </p>
            )}
            {jobs.map((job, jobIndex) => {
              const state = jobDisplayState(job);
              const chip = jobChips[state];
              const result = extractVideoMontageResult(job);
              const output = absoluteApiUrl(result?.output_url || result?.video_montage?.render?.output_url || null);
              const failReason = state === "failed"
                ? (job.safe_error || result?.video_montage?.render?.reason || result?.source_warning || result?.video_montage?.source_warning || "فشل الرندر.")
                : null;
              const honored = result?.notes_analysis?.honored || [];
              const unsupported = result?.notes_analysis?.unsupported || [];
              const source = jobSourceLabel(job);
              const isFirstCompleted = state === "completed" && !!output
                && jobs.findIndex((item) => jobDisplayState(item) === "completed" && !!absoluteApiUrl(extractVideoMontageResult(item)?.output_url || null)) === jobIndex;
              return (
                <div key={job.job_id || jobIndex} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${chip.className}`}>
                        {state === "running" && <Loader2 size={12} className="animate-spin" />}
                        {state === "completed" && <CheckCircle2 size={12} />}
                        {state === "failed" && <XCircle size={12} />}
                        {state === "queued" && <Clock3 size={12} />}
                        {chip.label}
                      </span>
                      {source.href ? (
                        <a href={source.href} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm font-bold text-[#2f80ff]" dir="ltr">
                          {source.label}
                        </a>
                      ) : (
                        <span className="min-w-0 truncate text-sm font-bold text-foreground" dir="ltr">{source.label}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground" dir="ltr">{formatJobTime(job.created_at)}</span>
                  </div>

                  {job.is_active && (
                    <div className="mt-3">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[#2f80ff] transition-all"
                          style={{ width: `${Math.max(4, Math.min(100, job.progress || 0))}%` }}
                        />
                      </div>
                      {job.message && (
                        <p className="os-text-wrap mt-2 text-xs leading-5 text-muted-foreground">{job.message}</p>
                      )}
                    </div>
                  )}

                  {failReason && (
                    <p className="os-text-wrap mt-3 rounded-xl border border-red-500/25 bg-red-500/8 p-3 text-xs leading-6 text-red-600">
                      {failReason}
                    </p>
                  )}

                  {result?.backgrounds_warning && (
                    <p className="os-text-wrap mt-3 rounded-xl border border-[#f8d84a]/40 bg-[#f8d84a]/10 p-3 text-xs leading-6 text-[#9a6b00]">
                      {result.backgrounds_warning}
                    </p>
                  )}

                  {(honored.length > 0 || unsupported.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {honored.map((item, index) => (
                        <span
                          key={`honored-${index}`}
                          title={item.detail || ""}
                          className="inline-flex items-center gap-1 rounded-full bg-[#18b89d]/12 px-3 py-1 text-xs font-bold text-[#087966]"
                        >
                          <CheckCircle2 size={12} />
                          طلبك: {item.request} ✓
                        </span>
                      ))}
                      {unsupported.map((item, index) => (
                        <span
                          key={`unsupported-${index}`}
                          title={item.detail || ""}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground"
                        >
                          <XCircle size={12} />
                          غير مدعوم: {item.request} ✗
                        </span>
                      ))}
                    </div>
                  )}

                  {output && (
                    <div className="mt-3">
                      {isFirstCompleted && (
                        <video
                          className="aspect-[9/16] max-h-[520px] w-full rounded-2xl bg-black object-contain"
                          src={output}
                          controls
                          playsInline
                        />
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <a
                          href={output}
                          download
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#18b89d] px-4 text-xs font-black text-white"
                        >
                          <Download size={15} />
                          تحميل MP4
                        </a>
                        <a href={output} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#2f80ff]">
                          فتح الفيديو
                        </a>
                        {(() => {
                          const pkg = absoluteApiUrl(result?.package_url || result?.video_montage?.package_url || null);
                          return pkg ? (
                            <a href={pkg} target="_blank" rel="noreferrer" className="text-xs font-bold text-muted-foreground">
                              ملف بيانات الرندر
                            </a>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {renderedScenes.length > 0 && (
            <div className="mt-5 rounded-3xl border border-[#2f80ff]/25 bg-[#2f80ff]/5 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-black text-foreground">تعديل يدوي للنصوص</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    عدّل الكابشن أو عنوان 3D لكل مشهد من آخر رندر، ثم اضغط تشغيل المونتاج لإعادة الرندر بنفس المصدر.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCaptionOverrides(renderedScenes.map((scene) => scene.caption || ""));
                    setTitleOverrides(renderedScenes.map((scene) => scene.behindText || ""));
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-black text-foreground hover:bg-muted"
                >
                  استرجاع النص الحالي
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {renderedScenes.map((scene, index) => (
                  <div key={scene.id || index} className="rounded-2xl border border-border bg-background p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-black text-muted-foreground">
                        مشهد {index + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Number(scene.start || 0).toFixed(1)}s - {Number(scene.end || 0).toFixed(1)}s
                      </span>
                    </div>
                    <label className="block text-xs font-bold text-muted-foreground">عنوان 3D</label>
                    <input
                      value={titleOverrides[index] ?? scene.behindText ?? ""}
                      onChange={(event) => {
                        const next = [...titleOverrides];
                        next[index] = event.target.value;
                        setTitleOverrides(next);
                      }}
                      className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground outline-none focus:border-[#2f80ff]"
                      dir="auto"
                    />
                    <label className="mt-3 block text-xs font-bold text-muted-foreground">الكابشن</label>
                    <textarea
                      value={captionOverrides[index] ?? scene.caption ?? ""}
                      onChange={(event) => {
                        const next = [...captionOverrides];
                        next[index] = event.target.value;
                        setCaptionOverrides(next);
                      }}
                      className="mt-1 min-h-20 w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm leading-6 text-foreground outline-none focus:border-[#2f80ff]"
                      dir="auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </section>
    </SuitePageShell>
  );
}
