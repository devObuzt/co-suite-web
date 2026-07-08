"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";
import { api, BillingCycle, ServiceItem } from "@/lib/api";
import { loadSelection } from "@/lib/funnelSelection";

const CYCLES: BillingCycle[] = ["one_time", "monthly", "yearly"];

export default function FunnelRequestPage() {
  const t = useT();
  const { lang } = useLanguage();
  const catalogLang = lang === "he" ? "he" : "ar";
  const router = useRouter();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selection = useMemo(() => loadSelection(), []);

  useEffect(() => {
    api.funnel.catalog().then(setItems).catch(() => setItems([]));
  }, []);

  const chosen = items.filter((i) => selection[i.id]);
  const totals = useMemo(() => {
    const acc: Record<string, { min: number; max: number }> = {};
    for (const item of chosen) {
      const qty = Math.max(1, selection[item.id] || 1);
      const bucket = (acc[item.billing_cycle] ||= { min: 0, max: 0 });
      bucket.min += item.price_min * qty;
      bucket.max += (item.price_max ?? item.price_min) * qty;
    }
    return acc;
  }, [chosen, selection]);

  async function submit() {
    setBusy(true); setError("");
    try {
      await api.funnel.submitRequest({
        items: chosen.map((i) => ({ service_id: i.id, qty: Math.max(1, selection[i.id] || 1) })),
        customer_notes: notes.trim() || undefined,
      });
      sessionStorage.removeItem("sbc_selection");
      router.push("/startbyconnec/done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const fmt = (n: number) => `₪${n.toLocaleString()}`;
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-3xl font-bold text-center">{t("sbc.request.title")}</h1>
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {chosen.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 text-sm">
            <span>
              {item.name[catalogLang] || item.name.ar}
              {selection[item.id] > 1 ? ` ×${selection[item.id]}` : ""}
            </span>
            <span className="text-muted-foreground">{t(`sbc.services.cycle.${item.billing_cycle}`)}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        {CYCLES.filter((c) => totals[c]).map((cycle) => (
          <div key={cycle} className="flex items-center justify-between font-semibold">
            <span>{t(`sbc.services.cycle.${cycle}`)}</span>
            <span>
              {totals[cycle].min === totals[cycle].max
                ? fmt(totals[cycle].min)
                : `${fmt(totals[cycle].min)}–${fmt(totals[cycle].max)}`}
            </span>
          </div>
        ))}
      </div>
      <textarea
        className="w-full rounded-lg border border-border bg-background px-3 py-2 min-h-24"
        placeholder={t("sbc.request.notes")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => router.push("/startbyconnec/services")}>
          {t("sbc.request.back")}
        </Button>
        <Button className="flex-1" disabled={busy || !chosen.length} onClick={submit}>
          {t("sbc.request.submit")}
        </Button>
      </div>
    </div>
  );
}
