"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Languages, Loader2, RotateCcw, Save, Search } from "lucide-react";
import { api, AppTextOverride } from "@/lib/api";
import { LANGUAGES, LangCode } from "@/lib/i18n/translations";
import { AdminTextCatalogRow, buildAdminTextCatalog } from "@/lib/i18n/adminTextCatalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function AdminLanguagesPage() {
  const [language, setLanguage] = useState<LangCode>("ar");
  const [overrides, setOverrides] = useState<AppTextOverride[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const overrideMap = useMemo(
    () => Object.fromEntries(overrides.map((item) => [item.key, item.value])),
    [overrides]
  );
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return buildAdminTextCatalog(language).filter((row) => {
      if (!q) return true;
      const override = overrideMap[row.key] || "";
      return [row.key, row.sourceLabel, row.defaultValue, override].some((value) =>
        value.toLocaleLowerCase().includes(q)
      );
    });
  }, [language, overrideMap, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, AdminTextCatalogRow[]>();
    for (const row of rows) {
      groups.set(row.sourceLabel, [...(groups.get(row.sourceLabel) || []), row]);
    }
    return [...groups.entries()];
  }, [rows]);

  async function load(nextLanguage = language) {
    setError("");
    const res = await api.admin.appText(nextLanguage);
    setOverrides(res.overrides || []);
    setDrafts({});
  }

  useEffect(() => {
    load("ar")
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load language texts"))
      .finally(() => setLoading(false));
  }, []);

  async function changeLanguage(value: string) {
    const next = value as LangCode;
    setLanguage(next);
    setLoading(true);
    try {
      await load(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load language texts");
    } finally {
      setLoading(false);
    }
  }

  async function save(row: AdminTextCatalogRow) {
    const value = drafts[row.key] ?? overrideMap[row.key] ?? row.defaultValue;
    setSavingKey(row.key);
    setNotice("");
    setError("");
    try {
      await api.admin.updateAppText({ language, key: row.key, value });
      await load(language);
      setNotice("Text updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Text update failed");
    } finally {
      setSavingKey(null);
    }
  }

  async function reset(row: AdminTextCatalogRow) {
    setSavingKey(row.key);
    setNotice("");
    setError("");
    try {
      await api.admin.updateAppText({ language, key: row.key, value: null });
      await load(language);
      setNotice("Text reset to default.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Text reset failed");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={15} /> Admin
          </Link>
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Languages size={15} /> Super admin</p>
          <h1 className="mt-1 text-3xl font-semibold">Languages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Editable application texts grouped by product area. Overrides beat the built-in default for every translation key.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={language}
            onChange={(event) => changeLanguage(event.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            aria-label="Select language"
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search key, source, or text" className="ps-9 sm:w-72" />
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div>}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <div className="flex items-center gap-2 font-semibold"><Languages size={15} /> Arabic is the first editable language here.</div>
        <p className="mt-1 leading-6">
          النصوص مرتبة حسب مصدرها في التطبيق. أي تعديل محفوظ هنا يتغلب على النص الافتراضي لكل استخدام مبني على مفاتيح الترجمة.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">Loading language texts...</div>
      ) : (
        <div className="space-y-4" dir={language === "ar" || language === "he" ? "rtl" : "ltr"}>
          {grouped.map(([source, items]) => (
            <details key={source} open={query.length > 0 || source === "التنقل العام" || source === "الدخول والتسجيل"} className="rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
                <span>{source}</span>
                <Badge variant="secondary">{items.length}</Badge>
              </summary>
              <div className="divide-y divide-border">
                {items.map((row) => {
                  const hasOverride = Object.prototype.hasOwnProperty.call(overrideMap, row.key);
                  const effectiveValue = drafts[row.key] ?? overrideMap[row.key] ?? row.defaultValue;
                  const isSaving = savingKey === row.key;
                  return (
                    <div key={row.key} className="grid gap-3 p-4 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
                      <div className="min-w-0">
                        <div className="break-all font-mono text-xs text-muted-foreground" dir="ltr">{row.key}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant={hasOverride ? "outline" : "secondary"}>{hasOverride ? "Edited" : "Default"}</Badge>
                        </div>
                      </div>
                      <textarea
                        value={effectiveValue}
                        onChange={(event) => setDrafts((current) => ({ ...current, [row.key]: event.target.value }))}
                        className="min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        dir="auto"
                      />
                      <div className="flex items-start gap-2">
                        <Button type="button" size="sm" onClick={() => save(row)} disabled={isSaving} className="gap-1">
                          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => reset(row)} disabled={isSaving || !hasOverride} className="gap-1">
                          <RotateCcw size={13} />
                          Reset
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
          {rows.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No text keys found.</p>}
        </div>
      )}
    </div>
  );
}
