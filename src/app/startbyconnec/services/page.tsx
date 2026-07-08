"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";
import { api, ServiceItem } from "@/lib/api";
import { loadSelection, saveSelection } from "@/lib/funnelSelection";

function price(item: ServiceItem): string {
  const min = item.price_min.toLocaleString();
  return item.price_max ? `₪${min}–${item.price_max.toLocaleString()}` : `₪${min}`;
}

export default function FunnelServicesPage() {
  const t = useT();
  const { lang } = useLanguage();
  const router = useRouter();
  const catalogLang = lang === "he" ? "he" : "ar";
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [recommended, setRecommended] = useState<string[]>([]);
  const [selection, setSelection] = useState<Record<string, number>>({});

  useEffect(() => {
    setSelection(loadSelection());
    api.funnel.catalog().then(setItems).catch(() => setItems([]));
    api.funnel.recommendations()
      .then((r) => setRecommended(r.recommended_service_ids || []))
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

  const count = Object.keys(selection).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pb-28 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{t("sbc.services.title")}</h1>
        <p className="text-muted-foreground">{t("sbc.services.subtitle")}</p>
      </div>
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
