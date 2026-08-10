"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";
import { api, API_BASE, Package, ServiceItem } from "@/lib/api";
import { loadPackage, loadSelection, savePackage, saveSelection } from "@/lib/funnelSelection";

const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "");
const coverSrc = (url: string) => (/^https?:\/\//.test(url) ? url : `${API_ORIGIN}${url}`);

function price(item: { price_min: number; price_max: number | null }): string {
  const min = item.price_min.toLocaleString();
  return item.price_max ? `₪${min}–${item.price_max.toLocaleString()}` : `₪${min}`;
}

export default function FunnelServicesPage() {
  const t = useT();
  const { lang } = useLanguage();
  const router = useRouter();
  const catalogLang = lang === "he" ? "he" : "ar";
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [recommended, setRecommended] = useState<string[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [recommendedPackages, setRecommendedPackages] = useState<string[]>([]);
  const [pickedPackage, setPickedPackage] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, number>>({});

  useEffect(() => {
    setSelection(loadSelection());
    setPickedPackage(loadPackage());
    api.funnel.catalog().then(setItems).catch(() => setItems([]));
    api.funnel.packages().then(setPackages).catch(() => setPackages([]));
    api.funnel.recommendations()
      .then((r) => {
        setRecommended(r.recommended_service_ids || []);
        setReasons(r.reasons || {});
        setRecommendedPackages(r.recommended_package_ids || []);
      })
      .catch(() => setRecommended([]));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceItem[]>();
    for (const item of items) {
      const key = item.category[catalogLang] || item.category.ar;
      map.set(key, [...(map.get(key) || []), item]);
    }
    return [...map.entries()];
  }, [items, catalogLang]);

  function toggle(id: string) {
    setSelection((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      saveSelection(next);
      return next;
    });
  }

  function setQty(id: string, qty: number) {
    setSelection((prev) => {
      const next = { ...prev, [id]: Math.max(1, qty) };
      saveSelection(next);
      return next;
    });
  }

  // Show only what the plan-driven recommender picked for this business;
  // fall back to the full active list if it returned nothing.
  const visiblePackages = useMemo(() => {
    if (!recommendedPackages.length) return packages;
    const order = new Map(recommendedPackages.map((id, i) => [id, i]));
    return packages.filter((p) => order.has(p.id)).sort((a, b) => (order.get(a.id)! - order.get(b.id)!));
  }, [packages, recommendedPackages]);

  const count = Object.keys(selection).length + (pickedPackage ? 1 : 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pb-28 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{t("sbc.services.title")}</h1>
        <p className="text-muted-foreground">{t("sbc.services.subtitle")}</p>
      </div>
      {visiblePackages.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{catalogLang === "he" ? "החבילות שלנו" : "باقاتنا"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {visiblePackages.map((pkg) => {
              const chosen = pickedPackage === pkg.id;
              return (
                <button
                  type="button"
                  key={pkg.id}
                  onClick={() => { const next = chosen ? null : pkg.id; setPickedPackage(next); savePackage(next); }}
                  className={`overflow-hidden rounded-xl border text-start transition ${
                    chosen ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-500/5" : "border-border bg-card"
                  }`}
                >
                  {pkg.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverSrc(pkg.cover_image_url)} alt="" className="aspect-video w-full object-cover" />
                  ) : null}
                  <div className="p-4">
                    <h3 className="font-semibold">{pkg.name[catalogLang] || pkg.name.ar}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{pkg.description[catalogLang] || pkg.description.ar}</p>
                    {pkg.features?.length ? (
                      <ul className="mt-3 space-y-1">
                        {pkg.features.map((f, i) => (
                          <li key={i} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                            <span className="text-emerald-600">✓</span>
                            <span>{f[catalogLang] || f.ar}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="font-bold">{price(pkg)}</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                        {t(`sbc.services.cycle.${pkg.billing_cycle}`)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {catalogLang === "he" ? "כולל מע\"מ" : "شامل الضريبة"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Never a commitment: pricing depends on the vertical and is
              confirmed manually before anything starts. */}
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
            {catalogLang === "he"
              ? "המחירים כוללים מע\"מ ומהווים הצעה ראשונית בלבד. המחיר עשוי להשתנות לפי סוג העסק (תחומים כמו פיננסים או פוליטיקה דורשים מאמץ שונה ותמחור נפרד), וכל הצעה מחייבת אישור ידני מצוותנו."
              : "الأسعار شاملة الضريبة وهي مقترح أولي فقط. قد يتغيّر السعر حسب نوع المصلحة (مجالات مثل المالية أو السياسية تحتاج مجهوداً أكبر وتسعيراً مختلفاً)، وكل عرض يحتاج موافقة يدوية من فريقنا."}
          </p>
        </section>
      )}
      {grouped.map(([category, rows]) => (
        <section key={category} className="space-y-3">
          <h2 className="text-lg font-semibold">{category}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((item) => {
              const selected = Boolean(selection[item.id]);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`rounded-xl border p-4 text-start transition ${
                    selected ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-500/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{item.name[catalogLang] || item.name.ar}</h3>
                    {recommended.includes(item.id) && (
                      <span className="shrink-0 text-[11px] rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5">
                        {t("sbc.services.recommended")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.description[catalogLang] || item.description.ar}
                  </p>
                  {reasons[item.id] ? (
                    // Why the plan calls for this service — turns the list into
                    // a proposal instead of a generic catalog.
                    <p className="mt-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs leading-5 text-emerald-700">
                      {reasons[item.id]}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    <span className="font-bold">{price(item)}</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {t(`sbc.services.cycle.${item.billing_cycle}`)}
                    </span>
                    {item.unit && (
                      <span className="text-xs text-muted-foreground">
                        {item.unit[catalogLang] || item.unit.ar}
                      </span>
                    )}
                  </div>
                  {selected && item.unit && (
                    <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => setQty(item.id, (selection[item.id] || 1) - 1)}>-</Button>
                      <span className="min-w-8 text-center">{selection[item.id]}</span>
                      <Button size="sm" variant="outline" onClick={() => setQty(item.id, (selection[item.id] || 1) + 1)}>+</Button>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur p-4">
        <div className="max-w-4xl mx-auto">
          <Button className="w-full" size="lg" disabled={!count} onClick={() => router.push("/startbyconnec/request")}>
            {t("sbc.services.continue")} ({count})
          </Button>
        </div>
      </div>
    </div>
  );
}
