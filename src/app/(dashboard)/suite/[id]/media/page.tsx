"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clapperboard,
  Download,
  Film,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { api, MediaAssetItem, MediaTreeLibrary } from "@/lib/api";
import { SuitePageShell } from "@/components/suite/SuitePageShell";

type MonthSelection = {
  library: string;
  year: number;
  month: string;
};

const monthFormatter = new Intl.DateTimeFormat("ar", { month: "long" });

function monthLabel(month: string): string {
  const index = Number(month);
  if (!Number.isFinite(index) || index < 1 || index > 12) return month;
  return monthFormatter.format(new Date(Date.UTC(2026, index - 1, 15)));
}

function itemDateLabel(createdAt: string | null): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function durationLabel(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export default function MediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [libraries, setLibraries] = useState<MediaTreeLibrary[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [expandedYears, setExpandedYears] = useState<string[]>([]);
  const [selection, setSelection] = useState<MonthSelection | null>(null);
  const [items, setItems] = useState<MediaAssetItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectMonth = useCallback((library: string, year: number, month: string) => {
    setSelection({ library, year, month });
    setLoadingItems(true);
    setError(null);
    api.media.list(id, { library, year, month: Number(month) })
      .then(setItems)
      .catch((err) => {
        setItems([]);
        setError(err instanceof Error ? err.message : "تعذر تحميل الميديا.");
      })
      .finally(() => setLoadingItems(false));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    api.media.tree(id)
      .then((tree) => {
        if (cancelled) return;
        const next = tree.libraries || [];
        setLibraries(next);
        const firstLibrary = next[0];
        const firstYear = firstLibrary?.years?.[0];
        const firstMonth = firstYear?.months?.[0];
        if (firstLibrary && firstYear && firstMonth) {
          setExpandedYears([`${firstLibrary.key}-${firstYear.year}`]);
          selectMonth(firstLibrary.key, firstYear.year, firstMonth.month);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "تعذر تحميل مكتبات الميديا.");
      })
      .finally(() => {
        if (!cancelled) setLoadingTree(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, selectMonth]);

  function toggleYear(key: string) {
    setExpandedYears((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  }

  const hasAnyMedia = libraries.some((library) => library.years.length > 0);
  const selectedLibrary = libraries.find((library) => library.key === selection?.library);

  return (
    <SuitePageShell title="الميديا" description="كل الفيديوهات والأصول الجاهزة، مرتبة تلقائيًا حسب المكتبة والشهر." backHref={`/suite/${id}`}>
      <section className="space-y-5" dir="rtl">
        {error && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {loadingTree ? (
          <div className="flex min-h-40 items-center justify-center rounded-3xl border border-border bg-card shadow-sm">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : !hasAnyMedia ? (
          <div className="rounded-3xl border border-dashed border-[#2f80ff]/35 bg-[#2f80ff]/5 p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-[#2f80ff] shadow-sm">
              <Clapperboard size={26} />
            </div>
            <p className="mx-auto mt-4 max-w-md text-base font-bold leading-7 text-foreground">
              لسا ما في ميديا محفوظة — أول مونتاج بيخلص بينحفظ هون تلقائيًا
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_2.1fr]">
            <article className="h-fit rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 px-1">
                <FolderOpen size={18} className="text-[#2f80ff]" />
                <h2 className="text-lg font-black text-foreground">المكتبات</h2>
              </div>
              <div className="mt-3 space-y-3">
                {libraries.map((library) => (
                  <div key={library.key} className="rounded-2xl border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2f80ff]/10 text-[#2f80ff]">
                        <Film size={16} />
                      </span>
                      <p className="os-text-wrap min-w-0 flex-1 text-sm font-black leading-6 text-foreground">{library.label}</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {library.years.map((year) => {
                        const yearKey = `${library.key}-${year.year}`;
                        const expanded = expandedYears.includes(yearKey);
                        return (
                          <div key={yearKey} className="rounded-xl border border-border">
                            <button
                              type="button"
                              onClick={() => toggleYear(yearKey)}
                              className="flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2 text-sm font-bold text-foreground"
                            >
                              <span className="inline-flex items-center gap-2">
                                <CalendarDays size={15} className="text-muted-foreground" />
                                {year.year}
                              </span>
                              <ChevronDown size={15} className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                            </button>
                            {expanded && (
                              <div className="space-y-1 px-2 pb-2">
                                {year.months.map((month) => {
                                  const active =
                                    selection?.library === library.key &&
                                    selection?.year === year.year &&
                                    selection?.month === month.month;
                                  return (
                                    <button
                                      key={month.month}
                                      type="button"
                                      onClick={() => selectMonth(library.key, year.year, month.month)}
                                      className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition ${
                                        active
                                          ? "bg-[#2f80ff] font-black text-white"
                                          : "font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                                      }`}
                                    >
                                      <span>{monthLabel(month.month)}</span>
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-black ${active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                                        {month.count}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {selectedLibrary?.label || "الميديا"}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-foreground">
                    {selection ? `${monthLabel(selection.month)} ${selection.year}` : "اختر شهرًا"}
                  </h2>
                </div>
                {selection && !loadingItems && (
                  <span className="rounded-full bg-[#18b89d]/10 px-3 py-1 text-xs font-bold text-[#087966]">
                    {items.length} عنصر
                  </span>
                )}
              </div>

              {loadingItems ? (
                <div className="flex min-h-48 items-center justify-center">
                  <Loader2 size={22} className="animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-border bg-background p-6 text-center text-sm font-semibold text-muted-foreground">
                  ما في عناصر بهالشهر.
                </p>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                      <video
                        className="aspect-[9/16] w-full rounded-2xl bg-black object-cover"
                        src={item.url}
                        poster={item.thumbnail_url || undefined}
                        controls
                        playsInline
                        preload="metadata"
                      />
                      <div className="flex items-start justify-between gap-2 p-3">
                        <div className="min-w-0">
                          <p className="os-text-wrap text-sm font-black leading-6 text-foreground" dir="auto">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {itemDateLabel(item.created_at)}
                            {durationLabel(item.duration_seconds) && (
                              <span className="ms-2 rounded bg-muted px-1.5 py-0.5 font-bold" dir="ltr">
                                {durationLabel(item.duration_seconds)}
                              </span>
                            )}
                          </p>
                        </div>
                        <a
                          href={item.url}
                          download
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#18b89d]/10 text-[#087966] transition hover:bg-[#18b89d]/20"
                          title="تحميل"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        )}
      </section>
    </SuitePageShell>
  );
}
