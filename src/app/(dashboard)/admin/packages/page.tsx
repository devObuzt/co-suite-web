"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { api, API_BASE, BillingCycle, Package } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ImagePlus, Loader2, Plus, Save, ShieldCheck, Sparkles, Trash2, Upload } from "lucide-react";

const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "");
const coverSrc = (url: string) => (/^https?:\/\//.test(url) ? url : `${API_ORIGIN}${url}`);

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
  billing_cycle: BillingCycle;
  price_min: string;
  price_max: string;
  is_active: boolean;
  sort_order: string;
  features_text: string;
  audience: string;
  cover_image_url: string | null;
}

const EMPTY_FORM: FormState = {
  id: null,
  name_ar: "",
  name_he: "",
  description_ar: "",
  description_he: "",
  billing_cycle: "one_time",
  price_min: "",
  price_max: "",
  is_active: true,
  sort_order: "0",
  features_text: "",
  audience: "all",
  cover_image_url: null,
};

function toForm(p: Package): FormState {
  return {
    id: p.id,
    name_ar: p.name.ar || "",
    name_he: p.name.he || "",
    description_ar: p.description.ar || "",
    description_he: p.description.he || "",
    billing_cycle: p.billing_cycle,
    price_min: String(p.price_min ?? ""),
    price_max: p.price_max != null ? String(p.price_max) : "",
    is_active: p.is_active,
    sort_order: String(p.sort_order ?? 0),
    // One bullet per line, "arabic | hebrew".
    features_text: (p.features || []).map((f) => `${f.ar || ""} | ${f.he || ""}`).join("\n"),
    audience: p.audience || "all",
    cover_image_url: p.cover_image_url ?? null,
  };
}

export default function AdminPackagesPage() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function seedLadder() {
    setSeeding(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.admin.seedPackages();
      await load();
      setNotice(`Seeded ${res.created} new package(s) — ${res.total} in the ladder.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  async function load() {
    setError(null);
    try {
      setItems(await api.admin.listPackages());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load packages");
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

  function edit(p: Package) {
    setForm(toForm(p));
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
      if (Number.isNaN(priceMin) || priceMin <= 0) throw new Error("Price min must be a positive number");
      const priceMax = form.price_max.trim() ? parseFloat(form.price_max) : null;
      if (priceMax != null && (Number.isNaN(priceMax) || priceMax <= 0)) throw new Error("Price max must be a positive number");
      const payload = {
        name: { ar: form.name_ar.trim(), he: form.name_he.trim() },
        description: { ar: form.description_ar.trim(), he: form.description_he.trim() },
        billing_cycle: form.billing_cycle,
        price_min: priceMin,
        price_max: priceMax,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order, 10) || 0,
        audience: form.audience,
        features: form.features_text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [ar, he] = line.split("|");
            return { ar: (ar || "").trim(), he: (he || ar || "").trim() };
          }),
      };
      if (form.id) {
        await api.admin.updatePackage(form.id, payload);
        setNotice("Package saved.");
      } else {
        const created = await api.admin.createPackage(payload);
        setForm(toForm(created)); // keep editing so a cover can be added
        setNotice("Package created — add a cover below.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(p: Package) {
    if (!window.confirm(`Deactivate "${p.name.ar || p.name.he}"?`)) return;
    setBusyId(p.id);
    setError(null);
    try {
      await api.admin.deactivatePackage(p.id);
      await load();
      if (form.id === p.id) resetForm();
      setNotice("Package deactivated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadCover(file: File) {
    if (!form.id) return;
    setCoverBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.admin.uploadPackageCover(form.id, file);
      setForm((f) => ({ ...f, cover_image_url: updated.cover_image_url }));
      await load();
      setNotice("Cover uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover upload failed");
    } finally {
      setCoverBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function generateCover() {
    if (!form.id) return;
    setCoverBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.admin.generatePackageCover(form.id);
      setForm((f) => ({ ...f, cover_image_url: updated.cover_image_url }));
      await load();
      setNotice("Cover generated from the package content.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover generation failed");
    } finally {
      setCoverBusy(false);
    }
  }

  function priceLabel(p: Package) {
    return p.price_max ? `₪${p.price_min}–${p.price_max}` : `₪${p.price_min}`;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Admin
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck size={16} /> Super admin</div>
          <h1 className="mt-1 text-3xl font-semibold">Packages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Curated offerings with a cover image, shown to leads on the pricing proposal.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" disabled={seeding} onClick={seedLadder}>
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Seed ladder
          </Button>
          <Button size="sm" onClick={resetForm} className="gap-2"><Plus size={14} /> New package</Button>
        </div>
      </header>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Loading packages…</div>}

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">Catalog</h2>
          <div className="os-scroll-x">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Cover</th>
                  <th className="py-2 pr-3">Name (ar / he)</th>
                  <th className="py-2 pr-3">Audience</th>
                  <th className="py-2 pr-3">Cycle</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Sort</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-3">
                      {p.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverSrc(p.cover_image_url)} alt="" className="h-12 w-20 rounded object-cover" />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded bg-muted text-muted-foreground"><ImagePlus size={16} /></div>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{p.name.ar}</div>
                      <div className="text-xs text-muted-foreground" dir="rtl">{p.name.he}</div>
                    </td>
                    <td className="py-3 pr-3"><Badge variant="secondary" className="font-mono text-[11px]">{p.audience || "all"}</Badge></td>
                    <td className="py-3 pr-3">{p.billing_cycle}</td>
                    <td className="py-3 pr-3">{priceLabel(p)}</td>
                    <td className="py-3 pr-3">{p.sort_order}</td>
                    <td className="py-3 pr-3"><Badge variant={p.is_active ? "outline" : "secondary"}>{p.is_active ? "active" : "inactive"}</Badge></td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => edit(p)}>Edit</Button>
                        <Button variant="outline" size="sm" disabled={busyId === p.id || !p.is_active} onClick={() => deactivate(p)} className="gap-1">
                          {busyId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Deactivate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No packages yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">{form.id ? "Edit package" : "New package"}</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm"><span className="font-medium">Name (ar)</span>
                <Input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} dir="rtl" /></label>
              <label className="grid gap-1 text-sm"><span className="font-medium">Name (he)</span>
                <Input value={form.name_he} onChange={(e) => setForm((f) => ({ ...f, name_he: e.target.value }))} dir="rtl" /></label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm"><span className="font-medium">Description (ar)</span>
                <textarea className="min-h-16 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm" value={form.description_ar} onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))} dir="rtl" /></label>
              <label className="grid gap-1 text-sm"><span className="font-medium">Description (he)</span>
                <textarea className="min-h-16 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm" value={form.description_he} onChange={(e) => setForm((f) => ({ ...f, description_he: e.target.value }))} dir="rtl" /></label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="grid gap-1 text-sm"><span className="font-medium">Billing cycle</span>
                <select value={form.billing_cycle} onChange={(e) => setForm((f) => ({ ...f, billing_cycle: e.target.value as BillingCycle }))} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm">
                  {CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select></label>
              <label className="grid gap-1 text-sm"><span className="font-medium">Price min (₪)</span>
                <Input type="number" value={form.price_min} onChange={(e) => setForm((f) => ({ ...f, price_min: e.target.value }))} /></label>
              <label className="grid gap-1 text-sm"><span className="font-medium">Price max (opt)</span>
                <Input type="number" value={form.price_max} onChange={(e) => setForm((f) => ({ ...f, price_max: e.target.value }))} /></label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm"><span className="font-medium">Sort order</span>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} /></label>
              <label className="flex items-center gap-2 self-end text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                <span className="font-medium">Active</span>
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={save} disabled={saving} className="gap-2 flex-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {form.id ? "Save changes" : "Create package"}
              </Button>
              {form.id && <Button variant="outline" onClick={resetForm} disabled={saving}>Cancel</Button>}
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Audience</span>
              <select
                value={form.audience}
                onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                <option value="all">all — الجميع</option>
                <option value="very_small">very_small — ميزانيات صغيرة جداً فقط</option>
                <option value="retail_web">retail_web — متاجر ومواقع</option>
                <option value="local_service">local_service — خدمات محلية</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Features — سطر لكل ميزة: عربي | עברית</span>
              <textarea
                className="min-h-24 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
                value={form.features_text}
                onChange={(e) => setForm((f) => ({ ...f, features_text: e.target.value }))}
                placeholder={"إدارة الحملات على ميتا | ניהול קמפיינים במטא\nتصاميم وبانرات | עיצובים ובאנרים"}
                dir="rtl"
              />
            </label>

            {/* Cover — needs a saved package to attach to */}
            <div className="mt-2 rounded-lg border border-dashed border-border p-3">
              <div className="mb-2 text-sm font-medium">Cover image</div>
              {!form.id ? (
                <p className="text-xs text-muted-foreground">Create the package first, then add or generate a cover.</p>
              ) : (
                <div className="space-y-3">
                  {form.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverSrc(form.cover_image_url)} alt="cover" className="aspect-video w-full rounded-md object-cover" />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted text-muted-foreground"><ImagePlus size={22} /></div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
                    <Button variant="outline" size="sm" disabled={coverBusy} onClick={() => fileInput.current?.click()} className="gap-1">
                      {coverBusy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload
                    </Button>
                    <Button variant="outline" size="sm" disabled={coverBusy} onClick={generateCover} className="gap-1">
                      {coverBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate from content
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Generation uses the package name + description. Save your edits first so they steer the image.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
