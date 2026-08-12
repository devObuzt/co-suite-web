"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { api, AdminBillingUsageEvent, AdminProvider, AdminSummary, ProviderUsageEvent, ProviderUsageSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CircleDollarSign, Loader2, RefreshCw, ShieldCheck, Tags, UserCog, Users } from "lucide-react";

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
  const [providerRows, setProviderRows] = useState<ProviderUsageEvent[]>([]);
  const [providerSummary, setProviderSummary] = useState<ProviderUsageSummary[]>([]);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [billingRows, setBillingRows] = useState<AdminBillingUsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providerCost = useMemo(
    () => providerSummary.reduce((sum, item) => sum + item.actual_cost_usd, 0),
    [providerSummary]
  );

  async function load(nextPeriod = period) {
    setError(null);
    const [s, catalog, billing, ps, pr] = await Promise.all([
      api.admin.summary(nextPeriod),
      api.admin.providers(),
      api.admin.billingUsage(nextPeriod),
      api.admin.providerUsageSummary(nextPeriod),
      api.admin.providerUsage(nextPeriod),
    ]);
    setSummary(s);
    setProviders(catalog);
    setBillingRows(billing);
    setProviderSummary(ps);
    setProviderRows(pr);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load admin"))
      .finally(() => setLoading(false));
  }, []);

  async function reloadWithPeriod(value: string) {
    setPeriod(value);
    setLoading(true);
    await load(value).catch((err) => setError(err instanceof Error ? err.message : "Could not load admin")).finally(() => setLoading(false));
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
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

      <section className="grid gap-3 md:grid-cols-2">
        <Link
          href="/admin/services"
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-primary/50 hover:bg-muted"
        >
          <Tags size={18} className="text-primary" />
          <div>
            <div className="font-semibold">الخدمات — كتالوج startbyconnec</div>
            <div className="text-xs text-muted-foreground">Manage catalog items, pricing, and cycles.</div>
          </div>
        </Link>
        <Link
          href="/admin/leads"
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-primary/50 hover:bg-muted"
        >
          <Users size={18} className="text-primary" />
          <div>
            <div className="font-semibold">الليدات — طلبات الخدمة</div>
            <div className="text-xs text-muted-foreground">Review leads and service requests.</div>
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Metric icon={<Users size={18} />} label="Users" value={summary?.users ?? 0} note={`${summary?.active_users ?? 0} active`} />
        <Metric icon={<UserCog size={18} />} label="Suites" value={summary?.suites ?? 0} note="owned workspaces" />
        <Metric icon={<Activity size={18} />} label="Jobs" value={summary?.generation_jobs ?? 0} note={period} />
        <Metric icon={<CircleDollarSign size={18} />} label="Provider cost" value={`$${(summary?.provider_cost_usd ?? providerCost).toFixed(4)}`} note="internal" />
        <Metric icon={<CircleDollarSign size={18} />} label="Billed" value={`$${(summary?.billed_amount_usd ?? 0).toFixed(4)}`} note="customer ledger" />
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
