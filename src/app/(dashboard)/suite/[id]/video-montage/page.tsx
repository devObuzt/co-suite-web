"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Captions,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Film,
  Layers3,
  Link2,
  Mic2,
  Music2,
  Scissors,
  Sparkles,
  Upload,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

type VideoMode = "talking_head" | "product_scenes";

type MontageOption = {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
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
  "تفريغ الكلام وتحليل المشاهد",
  "اختيار أفضل اللقطات",
  "مونتاج، كابتشن، وانتقالات",
  "تصدير نسخة للمراجعة",
];

export default function VideoMontagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [mode, setMode] = useState<VideoMode>("talking_head");
  const [selectedOptions, setSelectedOptions] = useState<string[]>(["captions", "dead_spaces", "music"]);
  const [notes, setNotes] = useState("");

  const activeMode = useMemo(() => modes.find((item) => item.id === mode) || modes[0], [mode]);

  function toggleOption(optionId: string) {
    setSelectedOptions((current) => (
      current.includes(optionId)
        ? current.filter((item) => item !== optionId)
        : [...current, optionId]
    ));
  }

  return (
    <SuitePageShell
      title="التوليد والإنشاء"
      description=""
      backHref={`/suite/${id}`}
    >
      <section className="space-y-5" dir="rtl">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-muted-foreground">مونتاج الفيديوهات</p>
          <div className="relative overflow-hidden rounded-3xl border border-[#2f80ff]/25 bg-card p-5 shadow-sm sm:p-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#2f80ff]/18 via-[#18b89d]/10 to-transparent" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#18b89d]/25 bg-[#18b89d]/10 px-3 py-1 text-xs font-bold text-[#087966]">
                  <BadgeCheck size={14} />
                  صفحة تجهيز قبل تفعيل الرندر
                </div>
                <h1 className="os-text-wrap text-3xl font-black leading-tight text-foreground sm:text-4xl">
                  مونتاج فيديوهات جاهز للمراجعة
                </h1>
                <p className="os-text-wrap max-w-2xl text-sm leading-7 text-muted-foreground">
                  هنا نجهز طلب المونتاج: نوع الفيديو، الملفات، الستايل، الكابتشن، والملاحظات. تشغيل الرندر النهائي سيتفعل بعد ربط عامل Remotion وFFmpeg.
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
            const isActive = item.id === mode;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`min-h-36 rounded-3xl border p-5 text-right shadow-sm transition sm:min-h-44 ${
                  isActive
                    ? "border-[#2f80ff] bg-gradient-to-br from-[#2f80ff]/14 via-[#18b89d]/10 to-background ring-1 ring-[#2f80ff]/20"
                    : "border-border bg-card hover:border-[#2f80ff]/40"
                }`}
              >
                <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${isActive ? "bg-[#2f80ff] text-white" : "bg-muted text-muted-foreground"}`}>
                  {item.icon}
                </span>
                <span className="block text-2xl font-black leading-tight text-foreground">{item.title}</span>
                <span className="os-text-wrap mt-3 block text-sm leading-6 text-muted-foreground">{item.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">الملفات والمصدر</p>
                <h2 className="mt-1 text-2xl font-black text-foreground">{activeMode.title}</h2>
              </div>
              <Upload className="text-[#2f80ff]" size={24} />
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-[#2f80ff]/35 bg-[#2f80ff]/5 p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-[#2f80ff] shadow-sm">
                <Upload size={22} />
              </div>
              <p className="mt-3 text-sm font-bold text-foreground">رفع الفيديوهات سيتفعل مع الرندر</p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
                حاليًا استخدم هذه الصفحة لتجهيز الطلب والخيارات. لاحقًا سيتم قبول ملفات فيديو، صور، أو روابط Google Drive.
              </p>
            </div>
            <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="video-link">
              رابط ملف أو مجلد فيديو
            </label>
            <div className="mt-2 flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2">
              <Link2 size={18} className="shrink-0 text-muted-foreground" />
              <input
                id="video-link"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="https://drive.google.com/..."
                dir="ltr"
              />
            </div>
            <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="montage-notes">
              ملاحظات المونتاج
            </label>
            <textarea
              id="montage-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-border bg-background p-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-[#2f80ff]"
              placeholder="مثال: خلي الفيديو سريع، كابتشن عربي، افتح بعنوان قوي، لا تستخدم موسيقى صاخبة..."
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
                const isSelected = selectedOptions.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-right transition ${
                      isSelected
                        ? "border-[#18b89d]/45 bg-[#18b89d]/10"
                        : "border-border bg-background hover:border-[#18b89d]/35"
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSelected ? "bg-[#18b89d] text-white" : "bg-muted text-muted-foreground"}`}>
                      {option.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-foreground">{option.label}</span>
                      <span className="os-text-wrap mt-1 block text-xs leading-5 text-muted-foreground">{option.desc}</span>
                    </span>
                    {isSelected && <CheckCircle2 size={18} className="shrink-0 text-[#18b89d]" />}
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
              <h2 className="mt-1 text-2xl font-black text-foreground">شو بصير لما نفعل الرندر؟</h2>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f8d84a]/18 px-3 py-1 text-xs font-bold text-[#9a6b00]">
              <Clock3 size={14} />
              بانتظار عامل المونتاج
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {pipeline.map((step, index) => (
              <div key={step} className="rounded-2xl border border-border bg-background p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f80ff]/10 text-xs font-black text-[#2f80ff]">
                  {index + 1}
                </span>
                <p className="os-text-wrap mt-3 text-sm font-bold leading-6 text-foreground">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-muted px-5 text-sm font-black text-muted-foreground"
            >
              <Clapperboard size={18} />
              تشغيل المونتاج قريبًا
            </button>
            <Link
              href={`/suite/${id}/create`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 text-sm font-black text-foreground transition hover:bg-muted"
            >
              <Sparkles size={18} />
              رجوع لإنشاء جديد
            </Link>
          </div>
          {notes && (
            <p className="os-text-wrap mt-4 rounded-2xl border border-[#2f80ff]/20 bg-[#2f80ff]/5 p-3 text-sm leading-6 text-muted-foreground">
              الملاحظات الحالية: {notes}
            </p>
          )}
        </article>
      </section>
    </SuitePageShell>
  );
}
