"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { api, BillingCycle, ServiceItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";

const CYCLES: { value: BillingCycle; label: string }[] = [
  { value: "one_time", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

interface FormState {
  id: string | null;
  name_ar: string;
  name_he: string;
  description_ar: string;
  description_he: string;
  category_ar: string;
  category_he: string;
  billing_cycle: BillingCycle;
  price_min: string;
  price_max: string;
  unit_ar: string;
  unit_he: string;
  is_active: boolean;
  sort_order: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  name_ar: "",
  name_he: "",
  description_ar: "",
  description_he: "",
  category_ar: "",
  category_he: "",
  billing_cycle: "one_time",
  price_min: "",
  price_max: "",
  unit_ar: "",
  unit_he: "",
  is_active: true,
  sort_order: "0",
};

function toForm(item: ServiceItem): FormState {
  return {
    id: item.id,
    name_ar: item.name.ar || "",
    name_he: item.name.he || "",
    description_ar: item.description.ar || "",
    description_he: item.description.he || "",
    category_ar: item.category.ar || "",
    category_he: item.category.he || "",
    billing_cycle: item.billing_cycle,
    price_min: String(item.price_min ?? ""),
    price_max: item.price_max != null ? String(item.price_max) : "",
    unit_ar: item.unit?.ar || "",
    unit_he: item.unit?.he || "",
    is_active: item.is_active,
    sort_order: String(item.sort_order ?? 0),
  };
}

export default function AdminServicesPage() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setItems(await api.admin.listServices());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load services");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user?.is_super_admin) return;
    load();
  }, [user?.is_super_admin]);

  if (!user?.is_super_admin) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Super admin access required.
        </div>
      </main>
    );
  }

  function edit(item: ServiceItem) {
    setForm(toForm(item));
    setNotice(null);
    setError(null);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setNotice(null);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const priceMin = parseFloat(form.price_min);
      if (Number.isNaN(priceMin) || priceMin <= 0) {
        throw new Error("Price min must be a positive number");
      }
      const priceMax = form.price_max.trim() ? parseFloat(form.price_max) : null;
      if (priceMax != null && (Number.isNaN(priceMax) || priceMax <= 0)) {
        throw new Error("Price max must be a positive number");
      }
      const payload = {
        name: { ar: form.name_ar.trim(), he: form.name_he.trim() },
        description: { ar: form.description_ar.trim(), he: form.description_he.trim() },
        category: { ar: form.category_ar.trim(), he: form.category_he.trim() },
        billing_cycle: form.billing_cycle,
        price_min: priceMin,
        price_max: priceMax,
        unit: form.unit_ar.trim() || form.unit_he.trim() ? { ar: form.unit_ar.trim(), he: form.unit_he.trim() } : null,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order, 10) || 0,
      };
      if (form.id) {
        await api.admin.updateService(form.id, payload);
      } else {
        await api.admin.createService(payload);
      }
      await load();
      resetForm();
      setNotice("Service saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(item: ServiceItem) {
    if (!window.confirm(`Deactivate "${item.name.ar || item.name.he}"?`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      await api.admin.deactivateService(item.id);
      await load();
      if (form.id === item.id) resetForm();
      setNotice("Service deactivated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed");
    } finally {
      setBusyId(null);
    }
  }

  function priceLabel(item: ServiceItem) {
    return item.price_max ? `₪${item.price_min}–${item.price_max}` : `₪${item.price_min}`;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Admin
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck size={16} /> Super admin</div>
          <h1 className="mt-1 text-3xl font-semibold">Services Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catalog of startbyconnec services shown to funnel leads.</p>
        </div>
        <Button size="sm" onClick={resetForm} className="gap-2"><Plus size={14} /> New service</Button>
      </header>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading services...
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">Catalog</h2>
          <div className="os-scroll-x">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Name (ar / he)</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Cycle</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Unit</th>
                  <th className="py-2 pr-3">Sort</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{item.name.ar}</div>
                      <div className="text-xs text-muted-foreground" dir="rtl">{item.name.he}</div>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{item.category.ar}</td>
                    <td className="py-3 pr-3">{item.billing_cycle}</td>
                    <td className="py-3 pr-3">{priceLabel(item)}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{item.unit?.ar || "—"}</td>
                    <td className="py-3 pr-3">{item.sort_order}</td>
                    <td className="py-3 pr-3">
                      <Badge variant={item.is_active ? "outline" : "secondary"}>{item.is_active ? "active" : "inactive"}</Badge>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => edit(item)}>Edit</Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === item.id || !item.is_active}
                          onClick={() => deactivate(item)}
                          className="gap-1"
                        >
                          {busyId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          Deactivate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No services yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">{form.id ? "Edit service" : "New service"}</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Name (ar)</span>
                <Input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} dir="rtl" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Name (he)</span>
                <Input value={form.name_he} onChange={(e) => setForm((f) => ({ ...f, name_he: e.target.value }))} dir="rtl" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Description (ar)</span>
                <textarea
                  className="min-h-16 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
                  value={form.description_ar}
                  onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
                  dir="rtl"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Description (he)</span>
                <textarea
                  className="min-h-16 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
                  value={form.description_he}
                  onChange={(e) => setForm((f) => ({ ...f, description_he: e.target.value }))}
                  dir="rtl"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Category (ar)</span>
                <Input value={form.category_ar} onChange={(e) => setForm((f) => ({ ...f, category_ar: e.target.value }))} dir="rtl" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Category (he)</span>
                <Input value={form.category_he} onChange={(e) => setForm((f) => ({ ...f, category_he: e.target.value }))} dir="rtl" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Billing cycle</span>
                <select
                  value={form.billing_cycle}
                  onChange={(e) => setForm((f) => ({ ...f, billing_cycle: e.target.value as BillingCycle }))}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                >
                  {CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Sort order</span>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Price min (₪)</span>
                <Input type="number" value={form.price_min} onChange={(e) => setForm((f) => ({ ...f, price_min: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Price max (₪, optional)</span>
                <Input type="number" value={form.price_max} onChange={(e) => setForm((f) => ({ ...f, price_max: e.target.value }))} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Unit (ar, optional)</span>
                <Input value={form.unit_ar} onChange={(e) => setForm((f) => ({ ...f, unit_ar: e.target.value }))} dir="rtl" placeholder="e.g. لكل منشور" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Unit (he, optional)</span>
                <Input value={form.unit_he} onChange={(e) => setForm((f) => ({ ...f, unit_he: e.target.value }))} dir="rtl" placeholder="לדוגמה לכל פוסט" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <span className="font-medium">Active</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={saving} className="gap-2 flex-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {form.id ? "Save changes" : "Create service"}
              </Button>
              {form.id && (
                <Button variant="outline" onClick={resetForm} disabled={saving}>Cancel</Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
