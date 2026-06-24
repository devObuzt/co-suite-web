"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, AdminBillingUsageEvent, AdminProvider, AdminSummary, AdminUser, AdminUserDetail, AuditLog, ProviderUsageEvent, ProviderUsageSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, CircleDollarSign, KeyRound, Loader2, RefreshCw, Search, ShieldCheck, UserCog, Users } from "lucide-react";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All" },
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
  const [billingRows, setBillingRows] = useState<AdminBillingUsageEvent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providerCost = useMemo(
    () => providerSummary.reduce((sum, item) => sum + item.actual_cost_usd, 0),
    [providerSummary]
  );

  async function load(nextPeriod = period, nextQuery = query) {
    setError(null);
    const [s, u, catalog, billing, ps, pr, l] = await Promise.all([
      api.admin.summary(nextPeriod),
      api.admin.users(nextQuery),
      api.admin.providers(),
      api.admin.billingUsage(nextPeriod),
      api.admin.providerUsageSummary(nextPeriod),
      api.admin.providerUsage(nextPeriod),
      api.admin.auditLogs(nextPeriod),
    ]);
    setSummary(s);
    setUsers(u);
    setProviders(catalog);
    setBillingRows(billing);
    setProviderSummary(ps);
    setProviderRows(pr);
    setLogs(l);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load admin")).finally(() => setLoading(false));
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

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck size={16} /> Super admin</div>
          <h1 className="mt-1 text-3xl font-semibold">Application Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Users, suites, logs, provider usage, tokens, and internal costs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel title="Users" action={
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email or name" className="w-56" />
            <Button variant="outline" size="sm" onClick={searchUsers} className="gap-2"><Search size={14} /> Search</Button>
          </div>
        }>
          <div className="overflow-x-auto">
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Request</th>
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
                {billingRows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No billed usage rows for this period.</td></tr>}
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
          <div className="overflow-x-auto">
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
        <div className="overflow-x-auto">
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

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}
