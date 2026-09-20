"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";
import { api, BillingCycle, Package, ServiceItem } from "@/lib/api";
import { loadPackage, loadSelection } from "@/lib/funnelSelection";

const CYCLES: BillingCycle[] = ["one_time", "monthly", "yearly"];

export default function FunnelRequestPage() {
  const t = useT();
  const { lang } = useLanguage();
  const catalogLang = lang === "he" ? "he" : "ar";
  const router = useRouter();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selection = useMemo(() => loadSelection(), []);
  const packageId = useMemo(() => loadPackage(), []);

  useEffect(() => {
    api.funnel.catalog().then(setItems).catch(() => setItems([]));
    api.funnel.packages().then(setPackages).catch(() => setPackages([]));
  }, []);

  const chosen = items.filter((i) => selection[i.id]);
  // Picking a ready-made package saves only the package id, never a service
  // selection, so gating this page on `chosen` alone left anyone who picked a
  // package staring at an empty summary and a permanently disabled button.
  const chosenPackage = useMemo(
    () => packages.find((p) => p.id === packageId) || null,
    [packages, packageId]
  );
  const hasChoice = chosen.length > 0 || Boolean(packageId);
  const totals = useMemo(() => {
    const acc: Record<string, { min: number; max: number }> = {};
    for (const item of chosen) {
      const qty = Math.max(1, selection[item.id] || 1);
      const bucket = (acc[item.billing_cycle] ||= { min: 0, max: 0 });
      bucket.min += item.price_min * qty;
      bucket.max += (item.price_max ?? item.price_min) * qty;
    }
    if (chosenPackage) {
      const bucket = (acc[chosenPackage.billing_cycle] ||= { min: 0, max: 0 });
      bucket.min += chosenPackage.price_min;
      bucket.max += chosenPackage.price_max ?? chosenPackage.price_min;
    }
    return acc;
  }, [chosen, selection, chosenPackage]);

  async function submit() {
    setBusy(true); setError("");
    try {
      await api.funnel.submitRequest({
        package_id: packageId,
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
      {hasChoice ? (
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {chosenPackage && (
          <div className="flex items-center justify-between gap-3 p-3 text-sm">
            <span className="font-semibold">
              {chosenPackage.name[catalogLang] || chosenPackage.name.ar}
            </span>
            <span className="text-muted-foreground">{t(`sbc.services.cycle.${chosenPackage.billing_cycle}`)}</span>
          </div>
        )}
        {chosen.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <span>
              {item.name[catalogLang] || item.name.ar}
              {selection[item.id] > 1 ? ` ×${selection[item.id]}` : ""}
            </span>
            <span className="text-muted-foreground">{t(`sbc.services.cycle.${item.billing_cycle}`)}</span>
          </div>
        ))}
      </div>
      ) : (
        /* Reaching this page with nothing picked used to render an empty box
           and a dead button with no explanation. Say what is missing and give
           a way back. */
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground" dir="auto">{t("sbc.request.empty")}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/startbyconnec/services")}
          >
            {t("sbc.request.back")}
          </Button>
        </div>
      )}
      {hasChoice && (
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
      )}
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
        <Button className="flex-1" disabled={busy || !hasChoice} onClick={submit}>
          {t("sbc.request.submit")}
        </Button>
      </div>
    </div>
  );
}
