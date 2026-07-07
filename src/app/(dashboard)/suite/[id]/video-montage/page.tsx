"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Captions,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Download,
  Film,
  Layers3,
  Link2,
  Loader2,
  Mic2,
  Music2,
  Play,
  Scissors,
  Sparkles,
  Upload,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { api, API_BASE, ApiError, GenerationStatus } from "@/lib/api";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

type VideoMode = "talking_head" | "product_scenes";

type MontageOption = {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
};

type VideoMontageResult = {
  rendered?: boolean;
  output_url?: string;
  package_url?: string;
  source_warning?: string;
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

const modes: Array<{
  id: VideoMode;
  title: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: "talking_head",
    title: "شخص يتحدث للكاميرا",
    desc: "فيديو شرح، شهادة عميل، أو ريل مباشر يحتاج قص، كابتشن، وتحسين الإيقاع.",
    icon: <UserRound size={22} />,
  },
  {
    id: "product_scenes",
    title: "منتجات / مشاهد متعددة",
    desc: "مقاطع منتجات، لقطات مكان، صور، أو مواد متفرقة تتحول لقصة قصيرة.",
    icon: <Film size={22} />,
  },
];

const options: MontageOption[] = [
  { id: "captions", label: "كابتشن وترجمة", desc: "نصوص واضحة فوق الفيديو حسب لغة الجمهور.", icon: <Captions size={18} /> },
  { id: "dead_spaces", label: "حذف الفراغات", desc: "قص السكتات والمقاطع الضعيفة لتحسين الإيقاع.", icon: <Scissors size={18} /> },
  { id: "background", label: "إزالة الخلفية", desc: "عزل الشخص أو المنتج عند الحاجة.", icon: <WandSparkles size={18} /> },
  { id: "titles", label: "عناوين 3D", desc: "افتتاحيات وعناوين قصيرة تجذب الانتباه.", icon: <Layers3 size={18} /> },
  { id: "music", label: "موسيقى ومؤثرات", desc: "إضافة موسيقى خفيفة ومؤثرات انتقال مناسبة.", icon: <Music2 size={18} /> },
  { id: "voice_cleanup", label: "تنظيف الصوت", desc: "تحسين الكلام وتقليل الضجيج قدر الإمكان.", icon: <Mic2 size={18} /> },
];

const pipeline = [
  "استلام الفيديوهات",
  "تحضير المصدر",
  "مونتاج أولي",
  "تغليف النتيجة",
  "رابط مراجعة وتحميل",
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

export default function VideoMontagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [mode, setMode] = useState<VideoMode>("talking_head");
  const [selectedOptions, setSelectedOptions] = useState<string[]>(options.map((option) => option.id));
  const [notes, setNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [stagedUrl, setStagedUrl] = useState("");
  const [staging, setStaging] = useState(false);
  const [captionOverrides, setCaptionOverrides] = useState<string[]>([]);
  const [titleOverrides, setTitleOverrides] = useState<string[]>([]);
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeMode = useMemo(() => modes.find((item) => item.id === mode) || modes[0], [mode]);
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
      setError(err instanceof Error ? err.message : "تعذر تجهيز المعاينة.");
    } finally {
      setStaging(false);
    }
  };
  const subjectTransform = `translate(${offsetX}%, ${offsetY}%) scale(${zoom})`;
  const isActive = Boolean(status?.is_active);
  const result = extractVideoMontageResult(status);
  const outputUrl = absoluteApiUrl(result?.output_url || result?.video_montage?.render?.output_url || null);
  const packageUrl = absoluteApiUrl(result?.package_url || result?.video_montage?.package_url || null);
  const renderReason = result?.video_montage?.render?.reason || result?.source_warning || result?.video_montage?.source_warning;
  const renderedScenes = result?.video_montage?.render?.scenes || [];
  const effectiveSourceUrl = sourceUrl.trim() || result?.video_montage?.source_url || "";

  useEffect(() => {
    let cancelled = false;
    api.videoMontage.latest(id)
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!status?.job_id || !status.is_active) return;
    const interval = window.setInterval(() => {
      api.videoMontage.get(id, status.job_id!)
        .then(setStatus)
        .catch((err) => setError(err instanceof Error ? err.message : "تعذر تحديث حالة المونتاج."));
    }, 2500);
    return () => window.clearInterval(interval);
  }, [id, status?.is_active, status?.job_id]);

  useEffect(() => {
    if (!renderedScenes.length) return;
    setCaptionOverrides((current) => current.length ? current : renderedScenes.map((scene) => scene.caption || ""));
    setTitleOverrides((current) => current.length ? current : renderedScenes.map((scene) => scene.behindText || ""));
  }, [renderedScenes]);

  function toggleOption(optionId: string) {
    setSelectedOptions((current) => (
      current.includes(optionId)
        ? current.filter((item) => item !== optionId)
        : [...current, optionId]
    ));
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
        mode,
        sourceUrl: sourceFile ? "" : stagedUrl || effectiveSourceUrl,
        options: selectedOptions,
        notes,
        sourceFile,
        captionOverrides,
        titleOverrides,
        zoom,
        offsetX,
        offsetY,
      });
      setStatus(next);
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
                  رندر V1 فعّال
                </div>
                <h1 className="os-text-wrap text-3xl font-black leading-tight text-foreground sm:text-4xl">
                  مونتاج فيديوهات جاهز للمراجعة
                </h1>
                <p className="os-text-wrap max-w-2xl text-sm leading-7 text-muted-foreground">
                  ارفع ملف فيديو أو ضع رابط مباشر، واختر ستايل المونتاج. النسخة الحالية تصدر MP4 أولي للمراجعة، ومعها حزمة بيانات للمرحلة القادمة من Remotion.
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2f80ff]/12 text-[#2f80ff]">
                <Clapperboard size={28} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map((item) => {
            const active = item.id === mode;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`min-h-36 rounded-3xl border p-5 text-right shadow-sm transition sm:min-h-44 ${
                  active
                    ? "border-[#2f80ff] bg-gradient-to-br from-[#2f80ff]/14 via-[#18b89d]/10 to-background ring-1 ring-[#2f80ff]/20"
                    : "border-border bg-card hover:border-[#2f80ff]/40"
                }`}
              >
                <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${active ? "bg-[#2f80ff] text-white" : "bg-muted text-muted-foreground"}`}>
                  {item.icon}
                </span>
                <span className="block text-2xl font-black leading-tight text-foreground">{item.title}</span>
                <span className="os-text-wrap mt-3 block text-sm leading-6 text-muted-foreground">{item.desc}</span>
              </button>
            );
          })}
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
                <h2 className="mt-1 text-2xl font-black text-foreground">{activeMode.title}</h2>
              </div>
              <Upload className="text-[#2f80ff]" size={24} />
            </div>
            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#2f80ff]/35 bg-[#2f80ff]/5 p-5 text-center transition hover:border-[#2f80ff]">
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(event) => {
                  setSourceFile(event.target.files?.[0] || null);
                  setStagedUrl("");
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
                }}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={result?.video_montage?.source_url || "https://example.com/video.mp4"}
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
                      <iframe
                        key={preview.src}
                        src={preview.src}
                        className="pointer-events-none h-full w-full"
                        style={{ transform: subjectTransform, transformOrigin: "50% 25%", border: 0 }}
                        allow="autoplay"
                      />
                    )}
                  </div>
                  {preview.kind === "drive" ? (
                    <button
                      type="button"
                      disabled={staging}
                      onClick={handleStagePreview}
                      className="mx-auto mt-3 block rounded-xl bg-[#2f80ff] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2568cc] disabled:opacity-60"
                    >
                      {staging ? "عم نجهز المعاينة الدقيقة… (حتى دقيقة)" : "جهّز معاينة دقيقة من الرابط"}
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
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">مسار التنفيذ</p>
              <h2 className="mt-1 text-2xl font-black text-foreground">حالة الرندر</h2>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f8d84a]/18 px-3 py-1 text-xs font-bold text-[#9a6b00]">
              <Clock3 size={14} />
              {loadingStatus ? "نفحص آخر Job" : status?.message || "جاهز للتشغيل"}
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {pipeline.map((step, index) => {
              const progress = status?.progress || 0;
              const done = progress >= [10, 25, 60, 88, 100][index];
              return (
                <div key={step} className={`rounded-2xl border p-4 ${done ? "border-[#18b89d]/35 bg-[#18b89d]/8" : "border-border bg-background"}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${done ? "bg-[#18b89d] text-white" : "bg-[#2f80ff]/10 text-[#2f80ff]"}`}>
                    {done ? <CheckCircle2 size={15} /> : index + 1}
                  </span>
                  <p className="os-text-wrap mt-3 text-sm font-bold leading-6 text-foreground">{step}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[#2f80ff] transition-all" style={{ width: `${Math.max(0, Math.min(100, status?.progress || 0))}%` }} />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startMontage}
              disabled={submitting || isActive}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-foreground px-5 text-sm font-black text-background transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting || isActive ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {isActive ? "جاري المونتاج..." : "تشغيل المونتاج"}
            </button>
            <Link
              href={`/suite/${id}/create`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 text-sm font-black text-foreground transition hover:bg-muted"
            >
              <Sparkles size={18} />
              رجوع لإنشاء جديد
            </Link>
          </div>

          {renderReason && (
            <p className="os-text-wrap mt-4 rounded-2xl border border-[#f8d84a]/35 bg-[#f8d84a]/12 p-3 text-sm leading-6 text-[#8a6200]">
              {renderReason}
            </p>
          )}

          {renderedScenes.length > 0 && (
            <div className="mt-5 rounded-3xl border border-[#2f80ff]/25 bg-[#2f80ff]/5 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-black text-foreground">تعديل يدوي للنصوص</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    عدّل الكابشن أو عنوان 3D لكل مشهد، ثم اضغط تشغيل المونتاج لإعادة الرندر بنفس المصدر.
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

          {outputUrl && (
            <div className="mt-5 rounded-3xl border border-[#18b89d]/30 bg-[#18b89d]/8 p-4">
              <h3 className="text-xl font-black text-foreground">الفيديو الناتج</h3>
              <video className="mt-3 aspect-[9/16] max-h-[620px] w-full rounded-2xl bg-black object-contain" src={outputUrl} controls playsInline />
              <a
                href={outputUrl}
                download
                className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#18b89d] px-4 text-sm font-black text-white"
              >
                <Download size={17} />
                تحميل MP4
              </a>
            </div>
          )}

          {packageUrl && (
            <a href={packageUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-bold text-[#2f80ff]">
              فتح ملف بيانات الرندر
            </a>
          )}
        </article>
      </section>
    </SuitePageShell>
  );
}
