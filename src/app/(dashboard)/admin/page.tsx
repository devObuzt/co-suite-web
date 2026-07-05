"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { api, AdminBillingUsageEvent, AdminProvider, AdminSummary, AdminUser, AdminUserDetail, AppTextOverride, AuditLog, CreativeAsset, ProviderUsageEvent, ProviderUsageSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LANGUAGES, LangCode } from "@/lib/i18n/translations";
import { AdminTextCatalogRow, buildAdminTextCatalog } from "@/lib/i18n/adminTextCatalog";
import { Activity, CircleDollarSign, KeyRound, Languages, Loader2, RefreshCw, RotateCcw, Save, Search, ShieldCheck, Tags, Upload, UserCog, Users, WandSparkles } from "lucide-react";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All" },
];

const CREATIVE_ASSET_KINDS = [
  { value: "music", label: "Music" },
  { value: "sfx", label: "SFX" },
  { value: "transition", label: "Transitions" },
  { value: "transition_video", label: "Video transitions" },
  { value: "visual_image", label: "Visual images" },
  { value: "visual_video", label: "Visual videos" },
];

export default function AdminPage() {
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [providerRows, setProviderRows] = useState<ProviderUsageEvent[]>([]);
  const [providerSummary, setProviderSummary] = useState<ProviderUsageSummary[]>([]);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [creativeAssets, setCreativeAssets] = useState<CreativeAsset[]>([]);
  const [creativeKind, setCreativeKind] = useState("transition");
  const [creativeFile, setCreativeFile] = useState<File | null>(null);
  const [creativeTitle, setCreativeTitle] = useState("");
  const [savingCreativeId, setSavingCreativeId] = useState<string | null>(null);
  const [seedingCreativeAssets, setSeedingCreativeAssets] = useState(false);
  const [billingRows, setBillingRows] = useState<AdminBillingUsageEvent[]>([]);
  const [textLanguage, setTextLanguage] = useState<LangCode>("ar");
  const [textOverrides, setTextOverrides] = useState<AppTextOverride[]>([]);
  const [textQuery, setTextQuery] = useState("");
  const [textDrafts, setTextDrafts] = useState<Record<string, string>>({});
  const [savingTextKey, setSavingTextKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providerCost = useMemo(
    () => providerSummary.reduce((sum, item) => sum + item.actual_cost_usd, 0),
    [providerSummary]
  );
  const textOverrideMap = useMemo(
    () => Object.fromEntries(textOverrides.map((item) => [item.key, item.value])),
    [textOverrides]
  );
  const textRows = useMemo(() => {
    const q = textQuery.trim().toLocaleLowerCase();
    return buildAdminTextCatalog(textLanguage).filter((row) => {
      if (!q) return true;
      const override = textOverrideMap[row.key] || "";
      return [row.key, row.sourceLabel, row.defaultValue, override].some((value) =>
        value.toLocaleLowerCase().includes(q)
      );
    });
  }, [textLanguage, textOverrideMap, textQuery]);

  async function load(nextPeriod = period, nextQuery = query) {
    setError(null);
    const [s, u, catalog, billing, ps, pr, l, ca] = await Promise.all([
      api.admin.summary(nextPeriod),
      api.admin.users(nextQuery),
      api.admin.providers(),
      api.admin.billingUsage(nextPeriod),
      api.admin.providerUsageSummary(nextPeriod),
      api.admin.providerUsage(nextPeriod),
      api.admin.auditLogs(nextPeriod),
      api.admin.creativeAssets(),
    ]);
    setSummary(s);
    setUsers(u);
    setProviders(catalog);
    setBillingRows(billing);
    setProviderSummary(ps);
    setProviderRows(pr);
    setLogs(l);
    setCreativeAssets(ca);
  }

  async function loadAppText(language = textLanguage) {
    const res = await api.admin.appText(language);
    setTextOverrides(res.overrides || []);
    setTextDrafts({});
  }

  useEffect(() => {
    Promise.all([load(), loadAppText("ar")])
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load admin"))
      .finally(() => setLoading(false));
  }, []);

  async function reloadWithPeriod(value: string) {
    setPeriod(value);
    setLoading(true);
    await load(value).catch((err) => setError(err instanceof Error ? err.message : "Could not load admin")).finally(() => setLoading(false));
  }

  async function searchUsers() {
    setLoading(true);
    await load(period, query).catch((err) => setError(err instanceof Error ? err.message : "Search failed")).finally(() => setLoading(false));
  }

  async function changeTextLanguage(value: string) {
    const lang = value as LangCode;
    setTextLanguage(lang);
    setSavingTextKey("__language__");
    setError(null);
    try {
      await loadAppText(lang);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load language texts");
    } finally {
      setSavingTextKey(null);
    }
  }

  async function saveText(row: AdminTextCatalogRow) {
    const value = textDrafts[row.key] ?? textOverrideMap[row.key] ?? row.defaultValue;
    setSavingTextKey(row.key);
    setNotice(null);
    setError(null);
    try {
      await api.admin.updateAppText({ language: textLanguage, key: row.key, value });
      await loadAppText(textLanguage);
      setNotice("Text updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Text update failed");
    } finally {
      setSavingTextKey(null);
    }
  }

  async function resetText(row: AdminTextCatalogRow) {
    setSavingTextKey(row.key);
    setNotice(null);
    setError(null);
    try {
      await api.admin.updateAppText({ language: textLanguage, key: row.key, value: null });
      await loadAppText(textLanguage);
      setNotice("Text reset to default.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Text reset failed");
    } finally {
      setSavingTextKey(null);
    }
  }

  async function openUser(userId: string) {
    setBusyUserId(userId);
    try {
      setSelectedUser(await api.admin.user(userId));
    } finally {
      setBusyUserId(null);
    }
  }

  async function updateUser(userId: string, patch: Partial<AdminUser>) {
    setBusyUserId(userId);
    setNotice(null);
    try {
      await api.admin.updateUser(userId, patch);
      await load();
      if (selectedUser?.user.id === userId) setSelectedUser(await api.admin.user(userId));
      setNotice("User updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyUserId(null);
    }
  }

  async function changePassword(userId: string) {
    const password = window.prompt("New password, minimum 8 characters");
    if (!password) return;
    setBusyUserId(userId);
    setNotice(null);
    try {
      await api.admin.changePassword(userId, password);
      await load();
      setNotice("Password changed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setBusyUserId(null);
    }
  }

  async function deactivateUser(userId: string) {
    if (!window.confirm("Deactivate this user? They will not be able to log in.")) return;
    setBusyUserId(userId);
    setNotice(null);
    try {
      await api.admin.deactivateUser(userId);
      await load();
      if (selectedUser?.user.id === userId) setSelectedUser(await api.admin.user(userId));
      setNotice("User deactivated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed");
    } finally {
      setBusyUserId(null);
    }
  }

  async function uploadCreativeAsset() {
    if (!creativeFile) {
      setError("Choose a creative asset file first.");
      return;
    }
    setSavingCreativeId("__upload__");
    setNotice(null);
    setError(null);
    try {
      await api.admin.uploadCreativeAsset({ kind: creativeKind, title: creativeTitle, file: creativeFile });
      setCreativeFile(null);
      setCreativeTitle("");
      setCreativeAssets(await api.admin.creativeAssets());
      setNotice("Creative asset uploaded and auto-classified.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creative asset upload failed");
    } finally {
      setSavingCreativeId(null);
    }
  }

  async function seedCreativeBuiltins() {
    setSeedingCreativeAssets(true);
    setNotice(null);
    setError(null);
    try {
      const res = await api.admin.seedCreativeBuiltins();
      setCreativeAssets(await api.admin.creativeAssets());
      setNotice(res.seeded > 0 ? `Seeded ${res.seeded} built-in creative assets.` : "Built-in creative assets are already synced.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Built-in creative asset seed failed");
    } finally {
      setSeedingCreativeAssets(false);
    }
  }

  async function updateCreativeTags(asset: CreativeAsset, rawTags: string) {
    setSavingCreativeId(asset.id);
    setNotice(null);
    setError(null);
    try {
      const tags = rawTags.split(",").map((item) => item.trim()).filter(Boolean);
      await api.admin.updateCreativeAsset(asset.id, { tags });
      setCreativeAssets(await api.admin.creativeAssets());
      setNotice("Creative asset tags updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creative asset update failed");
    } finally {
      setSavingCreativeId(null);
    }
  }

  async function deactivateCreative(asset: CreativeAsset) {
    if (!window.confirm(`Disable ${asset.title}? Existing renders will keep their generated files.`)) return;
    setSavingCreativeId(asset.id);
    setNotice(null);
    setError(null);
    try {
      await api.admin.deactivateCreativeAsset(asset.id);
      setCreativeAssets(await api.admin.creativeAssets());
      setNotice("Creative asset disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creative asset disable failed");
    } finally {
      setSavingCreativeId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck size={16} /> Super admin</div>
          <h1 className="mt-1 text-3xl font-semibold">Application Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Users, suites, logs, provider usage, tokens, and internal costs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/prompts"
            className="inline-flex h-7 items-center justify-center gap-2 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
          >
            <WandSparkles size={14} /> Prompts
          </Link>
          {PERIODS.map((item) => (
            <Button key={item.value} variant={period === item.value ? "default" : "outline"} size="sm" onClick={() => reloadWithPeriod(item.value)}>
              {item.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => reloadWithPeriod(period)} className="gap-2">
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </header>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading admin data...
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<Users size={18} />} label="Users" value={summary?.users ?? 0} note={`${summary?.active_users ?? 0} active`} />
        <Metric icon={<UserCog size={18} />} label="Suites" value={summary?.suites ?? 0} note="owned workspaces" />
        <Metric icon={<Activity size={18} />} label="Jobs" value={summary?.generation_jobs ?? 0} note={period} />
        <Metric icon={<CircleDollarSign size={18} />} label="Provider cost" value={`$${(summary?.provider_cost_usd ?? providerCost).toFixed(4)}`} note="internal" />
        <Metric icon={<CircleDollarSign size={18} />} label="Billed" value={`$${(summary?.billed_amount_usd ?? 0).toFixed(4)}`} note="customer ledger" />
      </section>

      <LanguageTextPanel
        rows={textRows}
        language={textLanguage}
        overrides={textOverrideMap}
        drafts={textDrafts}
        query={textQuery}
        savingKey={savingTextKey}
        onLanguageChange={changeTextLanguage}
        onQueryChange={setTextQuery}
        onDraftChange={(key, value) => setTextDrafts((current) => ({ ...current, [key]: value }))}
        onSave={saveText}
        onReset={resetText}
      />

      <CreativeAssetsPanel
        assets={creativeAssets}
        kind={creativeKind}
        title={creativeTitle}
        file={creativeFile}
        savingId={savingCreativeId}
        onKindChange={setCreativeKind}
        onTitleChange={setCreativeTitle}
        onFileChange={setCreativeFile}
        onUpload={uploadCreativeAsset}
        onSeedBuiltins={seedCreativeBuiltins}
        seedingBuiltins={seedingCreativeAssets}
        onUpdateTags={updateCreativeTags}
        onDeactivate={deactivateCreative}
      />

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel title="Users" action={
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email or name" className="w-56" />
            <Button variant="outline" size="sm" onClick={searchUsers} className="gap-2"><Search size={14} /> Search</Button>
          </div>
        }>
          <div className="os-scroll-x">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Suites</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{item.full_name}</div>
                      <div className="text-xs text-muted-foreground">{item.email}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={item.is_active ? "outline" : "destructive"}>{item.is_active ? "active" : "inactive"}</Badge>
                        {item.is_super_admin && <Badge>admin</Badge>}
                        {item.is_verified && <Badge variant="secondary">verified</Badge>}
                      </div>
                    </td>
                    <td className="py-3 pr-3">{item.suite_count ?? 0}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{formatDate(item.created_at)}</td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openUser(item.id)} disabled={busyUserId === item.id}>View</Button>
                        <Button variant="outline" size="sm" onClick={() => updateUser(item.id, { is_active: !item.is_active })} disabled={busyUserId === item.id}>
                          {item.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => changePassword(item.id)} disabled={busyUserId === item.id} className="gap-1">
                          <KeyRound size={13} /> Password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Selected User">
          {!selectedUser ? (
            <p className="text-sm text-muted-foreground">Select a user to inspect suites and admin actions.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold">{selectedUser.user.full_name}</div>
                <div className="text-sm text-muted-foreground">{selectedUser.user.email}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateUser(selectedUser.user.id, { is_super_admin: !selectedUser.user.is_super_admin })}>
                  {selectedUser.user.is_super_admin ? "Remove admin" : "Make admin"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateUser(selectedUser.user.id, { is_verified: !selectedUser.user.is_verified })}>
                  {selectedUser.user.is_verified ? "Unverify" : "Verify"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => deactivateUser(selectedUser.user.id)}>Safe delete</Button>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Suites</div>
                {selectedUser.suites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No suites.</p>
                ) : selectedUser.suites.map((suite) => (
                  <div key={suite.id} className="rounded-md border border-border p-3">
                    <div className="font-medium">{suite.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{suite.slug} · {suite.status} · {formatDate(suite.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Billed Usage Requests">
          <div className="mb-3 text-sm text-muted-foreground">
            These rows explain the billed total for the selected period. Provider cost is separate and only appears for newly instrumented provider calls.
          </div>
          <div className="os-scroll-x">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Request</th>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2 pr-3">Suite</th>
                  <th className="py-2 pr-3">Owner</th>
                  <th className="py-2 pr-3">Tokens</th>
                  <th className="py-2 pr-3">Actual</th>
                  <th className="py-2 pr-3">Billed</th>
                  <th className="py-2 pr-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {billingRows.map((item) => (
                  <tr key={item.id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-3 text-muted-foreground">{formatDate(item.created_at)}</td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{item.event_type}</div>
                      <div className="text-xs text-muted-foreground">{item.billing_event_type} · {item.ledger_account}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{item.provider || "-"}</div>
                      <div className="text-xs text-muted-foreground">{item.model || item.cost_basis || "-"}</div>
                    </td>
                    <td className="py-3 pr-3">{item.suite_name || shortId(item.suite_id)}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{item.owner_email || "-"}</td>
                    <td className="py-3 pr-3">{item.amount_tokens || 0}</td>
                    <td className="py-3 pr-3">${item.actual_cost_usd.toFixed(4)}</td>
                    <td className="py-3 pr-3 font-semibold">${item.billed_amount.toFixed(4)}</td>
                    <td className="max-w-[260px] truncate py-3 pr-3 text-xs text-muted-foreground">
                      {JSON.stringify(item.event_data || {})}
                    </td>
                  </tr>
                ))}
                {billingRows.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No billed usage rows for this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="External Providers">
          <div className="grid gap-3 md:grid-cols-2">
            {providers.map((item) => (
              <div key={item.provider} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold capitalize">{item.provider}</div>
                  <Badge variant={item.configured ? "outline" : "secondary"}>{item.configured ? "configured" : "missing env"}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">Models</div>
                  <div className="mt-1">{item.models.filter(Boolean).join(", ") || "-"}</div>
                  <div className="mt-2 font-medium text-foreground">Operations</div>
                  <div className="mt-1">{item.operations.join(", ")}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Provider Usage Summary">
          <div className="os-scroll-x">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr><th className="py-2 pr-3">Provider</th><th className="py-2 pr-3">Model</th><th className="py-2 pr-3">Requests</th><th className="py-2 pr-3">Tokens</th><th className="py-2 pr-3">Cost</th></tr>
              </thead>
              <tbody>
                {providerSummary.map((item) => (
                  <tr key={`${item.provider}-${item.model || "default"}`} className="border-b border-border/60">
                    <td className="py-3 pr-3 font-medium">{item.provider}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{item.model || "-"}</td>
                    <td className="py-3 pr-3">{item.requests}</td>
                    <td className="py-3 pr-3">{item.total_tokens}</td>
                    <td className="py-3 pr-3">${item.actual_cost_usd.toFixed(4)}</td>
                  </tr>
                ))}
                {providerSummary.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No provider usage for this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Provider Requests">
          <div className="max-h-[360px] overflow-auto">
            {providerRows.map((item) => (
              <div key={item.id} className="border-b border-border py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{item.provider} · {item.operation}</div>
                  <Badge variant={item.status === "success" ? "outline" : "secondary"}>{item.status}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.model || item.endpoint || "-"} · {item.total_tokens} tokens · ${item.actual_cost_usd.toFixed(4)} · {formatDate(item.created_at)}
                </div>
              </div>
            ))}
            {providerRows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No provider requests yet.</p>}
          </div>
        </Panel>
      </section>

      <Panel title="Audit Logs">
        <div className="os-scroll-x">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Actor</th><th className="py-2 pr-3">Action</th><th className="py-2 pr-3">Resource</th><th className="py-2 pr-3">Metadata</th></tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="py-3 pr-3 text-muted-foreground">{formatDate(item.created_at)}</td>
                  <td className="py-3 pr-3">{item.actor_email || "-"}</td>
                  <td className="py-3 pr-3 font-medium">{item.action}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{item.resource_type}{item.resource_id ? `/${shortId(item.resource_id)}` : ""}</td>
                  <td className="max-w-[360px] truncate py-3 pr-3 text-xs text-muted-foreground">{JSON.stringify(item.metadata || {})}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No audit logs for this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </main>
  );
}

function Metric({ icon, label, value, note }: { icon: ReactNode; label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function LanguageTextPanel({
  rows,
  language,
  overrides,
  drafts,
  query,
  savingKey,
  onLanguageChange,
  onQueryChange,
  onDraftChange,
  onSave,
  onReset,
}: {
  rows: AdminTextCatalogRow[];
  language: LangCode;
  overrides: Record<string, string>;
  drafts: Record<string, string>;
  query: string;
  savingKey: string | null;
  onLanguageChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onDraftChange: (key: string, value: string) => void;
  onSave: (row: AdminTextCatalogRow) => void;
  onReset: (row: AdminTextCatalogRow) => void;
}) {
  const grouped = useMemo(() => {
    const groups = new Map<string, AdminTextCatalogRow[]>();
    for (const row of rows) {
      groups.set(row.sourceLabel, [...(groups.get(row.sourceLabel) || []), row]);
    }
    return [...groups.entries()];
  }, [rows]);

  return (
    <Panel
      title="Languages"
      action={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            aria-label="Select language"
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
          <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search key, source, or text" className="w-full sm:w-72" />
        </div>
      }
    >
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <div className="flex items-center gap-2 font-semibold"><Languages size={15} /> Arabic is the first editable language here.</div>
        <p className="mt-1 leading-6">
          النصوص مرتبة حسب مصدرها في التطبيق. أي تعديل محفوظ هنا يتغلب على النص الافتراضي لكل استخدام مبني على مفاتيح الترجمة.
        </p>
      </div>
      <div className="space-y-4" dir={language === "ar" || language === "he" ? "rtl" : "ltr"}>
        {grouped.map(([source, items]) => (
          <details key={source} open={query.length > 0 || source === "التنقل العام" || source === "الدخول والتسجيل"} className="rounded-lg border border-border bg-background">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
              <span>{source}</span>
              <Badge variant="secondary">{items.length}</Badge>
            </summary>
            <div className="divide-y divide-border">
              {items.map((row) => {
                const hasOverride = Object.prototype.hasOwnProperty.call(overrides, row.key);
                const effectiveValue = drafts[row.key] ?? overrides[row.key] ?? row.defaultValue;
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
                      onChange={(event) => onDraftChange(row.key, event.target.value)}
                      className="min-h-20 w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm leading-6 outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      dir="auto"
                    />
                    <div className="flex items-start gap-2">
                      <Button type="button" size="sm" onClick={() => onSave(row)} disabled={isSaving} className="gap-1">
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => onReset(row)} disabled={isSaving || !hasOverride} className="gap-1">
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
    </Panel>
  );
}

function CreativeAssetsPanel({
  assets,
  kind,
  title,
  file,
  savingId,
  onKindChange,
  onTitleChange,
  onFileChange,
  onUpload,
  onSeedBuiltins,
  seedingBuiltins,
  onUpdateTags,
  onDeactivate,
}: {
  assets: CreativeAsset[];
  kind: string;
  title: string;
  file: File | null;
  savingId: string | null;
  onKindChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onFileChange: (value: File | null) => void;
  onUpload: () => void;
  onSeedBuiltins: () => void;
  seedingBuiltins: boolean;
  onUpdateTags: (asset: CreativeAsset, rawTags: string) => void;
  onDeactivate: (asset: CreativeAsset) => void;
}) {
  const counts = useMemo(() => {
    return CREATIVE_ASSET_KINDS.map((item) => ({
      ...item,
      count: assets.filter((asset) => asset.kind === item.value).length,
      uses: assets.filter((asset) => asset.kind === item.value).reduce((sum, asset) => sum + asset.usage_count, 0),
    }));
  }, [assets]);
  const visible = assets.filter((asset) => asset.kind === kind);

  return (
    <Panel
      title="Creative Asset Library"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {CREATIVE_ASSET_KINDS.map((item) => (
            <Button key={item.value} type="button" size="sm" variant={kind === item.value ? "default" : "outline"} onClick={() => onKindChange(item.value)}>
              {item.label}
            </Button>
          ))}
        </div>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        {counts.map((item) => (
          <div key={item.value} className="rounded-lg border border-border bg-background p-3">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-2 text-xl font-semibold">{item.count}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.uses} uses</div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-lg border border-dashed border-border bg-background p-4">
        <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Kind</span>
            <select value={kind} onChange={(event) => onKindChange(event.target.value)} className="h-9 rounded-lg border border-input bg-card px-3">
              {CREATIVE_ASSET_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Title</span>
            <Input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Optional display title" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">File</span>
            <input type="file" onChange={(event) => onFileChange(event.target.files?.[0] || null)} className="text-sm" />
          </label>
          <Button type="button" onClick={onUpload} disabled={!file || savingId === "__upload__"} className="gap-2">
            {savingId === "__upload__" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onSeedBuiltins} disabled={seedingBuiltins} className="gap-2">
            {seedingBuiltins ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />}
            Seed built-ins
          </Button>
          <span className="text-xs text-muted-foreground">Sync the packaged music, SFX, and video transition library into the database.</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Use <strong>Transitions</strong> for lighting, classic cuts, noisy/glitch hits, whooshes, and scene-change accents. Music remains long background beds.
        </p>
      </div>

      <div className="os-scroll-x">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="py-2 pr-3">Asset</th><th className="py-2 pr-3">Tags</th><th className="py-2 pr-3">Use cases</th><th className="py-2 pr-3">Usage</th><th className="py-2 pr-3">Actions</th></tr>
          </thead>
          <tbody>
            {visible.map((asset) => (
              <tr key={asset.id} className="border-b border-border/60 align-top">
                <td className="py-3 pr-3">
                  <div className="font-medium">{asset.title}</div>
                  <a href={asset.storage_url} target="_blank" rel="noreferrer" className="mt-1 block max-w-[260px] truncate text-xs text-primary">{asset.storage_url}</a>
                  <div className="mt-1 text-xs text-muted-foreground">{asset.content_type || asset.kind}</div>
                </td>
                <td className="py-3 pr-3">
                  <div className="mb-2 flex flex-wrap gap-1">{asset.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
                  <Input
                    defaultValue={asset.tags.join(", ")}
                    onBlur={(event) => {
                      if (event.currentTarget.value !== asset.tags.join(", ")) onUpdateTags(asset, event.currentTarget.value);
                    }}
                    disabled={savingId === asset.id}
                    placeholder="energy, fashion, shock..."
                  />
                </td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap gap-1">{asset.use_cases.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}</div>
                </td>
                <td className="py-3 pr-3">
                  <div className="font-semibold">{asset.usage_count}</div>
                  <div className="text-xs text-muted-foreground">{asset.last_used_at ? formatDate(asset.last_used_at) : "not used yet"}</div>
                </td>
                <td className="py-3 pr-3">
                  <Button type="button" size="sm" variant="outline" onClick={() => onDeactivate(asset)} disabled={savingId === asset.id} className="gap-1">
                    {savingId === asset.id ? <Loader2 size={13} className="animate-spin" /> : <Tags size={13} />}
                    Disable
                  </Button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No active assets for this kind yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}
