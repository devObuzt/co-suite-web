"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { api, AuditLog } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";

const PERIODS = ["today", "yesterday", "week", "month", "all"] as const;
const LIMITS = [100, 200, 500] as const;

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function AuditRow({ log }: { log: AuditLog }) {
  const [open, setOpen] = useState(false);
  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;
  return (
    <>
      <tr className="border-b border-border/60 align-top">
        <td className="py-2.5 pr-3 whitespace-nowrap text-xs text-muted-foreground">{fmt(log.created_at)}</td>
        <td className="py-2.5 pr-3">
          <div className="text-sm" dir="ltr">{log.actor_email || <span className="text-muted-foreground">system</span>}</div>
        </td>
        <td className="py-2.5 pr-3"><Badge variant="secondary" className="font-mono text-[11px]">{log.action}</Badge></td>
        <td className="py-2.5 pr-3 text-xs">
          <span className="text-muted-foreground">{log.resource_type}</span>
          {log.resource_id ? <span className="ml-1 font-mono text-[11px]">{log.resource_id.slice(0, 8)}</span> : null}
        </td>
        <td className="py-2.5 pr-3 text-xs text-muted-foreground">{log.ip_address || "—"}</td>
        <td className="py-2.5 pr-3 text-right">
          {hasMeta ? (
            <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} details
            </button>
          ) : null}
        </td>
      </tr>
      {open && hasMeta ? (
        <tr className="border-b border-border/60 bg-muted/40">
          <td colSpan={6} className="px-3 py-2">
            <pre className="os-scroll-x max-h-64 overflow-auto rounded-md bg-background p-3 text-xs leading-relaxed" dir="ltr">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default function AdminAuditLogsPage() {
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("week");
  const [limit, setLimit] = useState<number>(200);
  const [action, setAction] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLogs(await api.admin.auditLogs(period, { action: action.trim() || undefined, limit }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load audit logs");
    } finally {
      setLoading(false);
    }
  }, [period, limit, action]);

  useEffect(() => {
    if (!user?.is_super_admin) return;
    setLoading(true);
    load();
  }, [user?.is_super_admin, load]);

  const filtered = useMemo(() => {
    const t = text.trim().toLowerCase();
    if (!t) return logs;
    return logs.filter((l) =>
      [l.actor_email, l.action, l.resource_type, l.resource_id, l.ip_address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [logs, text]);

  if (!user?.is_super_admin) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Super admin access required.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="border-b border-border pb-5">
        <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Admin
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck size={16} /> Super admin</div>
        <h1 className="mt-1 text-3xl font-semibold">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every admin and system action, newest first.</p>
      </header>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Filters */}
      <section className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Period</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm">
            {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Action (exact)</span>
          <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. admin.user.update" className="w-56" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Limit</span>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm">
            {LIMITS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <Button size="sm" variant="outline" onClick={() => { setLoading(true); load(); }} className="gap-1">
          <RefreshCw size={13} /> Apply
        </Button>
        <label className="ml-auto grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Filter loaded rows</span>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="email, action, resource…" className="w-64 pl-8" />
          </div>
        </label>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Loading logs…</div>
      ) : (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 text-sm text-muted-foreground">{filtered.length} of {logs.length} shown</div>
          <div className="os-scroll-x">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Resource</th>
                  <th className="py-2 pr-3">IP</th>
                  <th className="py-2 pr-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => <AuditRow key={log.id} log={log} />)}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No matching audit logs.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
