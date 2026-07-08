"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { api, AdminLead, AdminLeadDetail, ServiceRequestOut } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Mail, Phone, ShieldCheck } from "lucide-react";

const LEAD_STATUSES = ["new", "in_progress", "won", "lost"] as const;
const REQUEST_STATUSES = ["new", "seen", "handled"] as const;

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function statusVariant(status: string): "outline" | "secondary" | "destructive" | "default" {
  if (status === "won") return "outline";
  if (status === "lost") return "destructive";
  if (status === "in_progress") return "default";
  return "secondary";
}

export default function AdminLeadsPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-7xl p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading...
        </div>
      </main>
    }>
      <AdminLeadsInner />
    </Suspense>
  );
}

function AdminLeadsInner() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminLeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingLead, setSavingLead] = useState(false);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);

  const load = useCallback(async (status = statusFilter) => {
    setError(null);
    try {
      setLeads(await api.admin.listLeads(status || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load leads");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!user?.is_super_admin) return;
    load();
  }, [user?.is_super_admin, load]);

  const openLead = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setError(null);
    try {
      const res = await api.admin.leadDetail(id);
      setDetail(res);
      setAdminNotes(res.lead.admin_notes || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load lead");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.is_super_admin) return;
    const leadParam = searchParams.get("lead");
    if (leadParam) openLead(leadParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.is_super_admin, searchParams]);

  if (!user?.is_super_admin) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Super admin access required.
        </div>
      </main>
    );
  }

  async function changeFilter(value: string) {
    setStatusFilter(value);
    setLoading(true);
    await load(value);
  }

  async function saveLead() {
    if (!detail) return;
    setSavingLead(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.admin.updateLead(detail.lead.id, {
        status: detail.lead.status,
        admin_notes: adminNotes,
      });
      setDetail((d) => (d ? { ...d, lead: updated } : d));
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
      setNotice("Lead updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingLead(false);
    }
  }

  function changeLeadStatus(status: string) {
    setDetail((d) => (d ? { ...d, lead: { ...d.lead, status } } : d));
  }

  async function changeRequestStatus(req: ServiceRequestOut, status: "new" | "seen" | "handled") {
    setSavingRequestId(req.id);
    setError(null);
    try {
      const updated = await api.admin.updateServiceRequest(req.id, { status });
      setDetail((d) => (d ? { ...d, requests: d.requests.map((r) => (r.id === req.id ? { ...r, status: updated.status } : r)) } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingRequestId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Admin
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck size={16} /> Super admin</div>
          <h1 className="mt-1 text-3xl font-semibold">Leads Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">startbyconnec leads and their service requests.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={statusFilter === "" ? "default" : "outline"} size="sm" onClick={() => changeFilter("")}>All</Button>
          {LEAD_STATUSES.map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => changeFilter(s)}>
              {s}
            </Button>
          ))}
        </div>
      </header>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading leads...
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.5fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">Leads</h2>
          <div className="max-h-[70vh] space-y-2 overflow-auto">
            {leads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => openLead(lead.id)}
                className={`w-full rounded-lg border p-3 text-start transition ${
                  selectedId === lead.id ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border bg-background hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{lead.full_name}</div>
                  <Badge variant={statusVariant(lead.status)}>{lead.status}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{lead.phone}</div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(lead.created_at)}</span>
                  {lead.has_request && <Badge variant="secondary">has request</Badge>}
                </div>
              </button>
            ))}
            {leads.length === 0 && !loading && (
              <p className="py-8 text-center text-sm text-muted-foreground">No leads for this filter.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">Lead detail</h2>
          {detailLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Loading lead...
            </div>
          )}
          {!detailLoading && !detail && (
            <p className="text-sm text-muted-foreground">Select a lead to see contact info, suite, and service requests.</p>
          )}
          {!detailLoading && detail && (
            <div className="space-y-5">
              <div>
                <div className="text-lg font-semibold">{detail.lead.full_name}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-sm">
                  <a href={`mailto:${detail.lead.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Mail size={14} /> {detail.lead.email}
                  </a>
                  <a href={`tel:${detail.lead.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Phone size={14} /> {detail.lead.phone}
                  </a>
                </div>
                {detail.suite && (
                  <Link href={`/suite/${detail.suite.id}/profile`} className="mt-2 inline-block text-sm text-primary hover:underline">
                    Suite: {detail.suite.name} →
                  </Link>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Lead status</span>
                  <select
                    value={detail.lead.status}
                    onChange={(e) => changeLeadStatus(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <div className="flex items-end">
                  <Button size="sm" onClick={saveLead} disabled={savingLead} className="gap-2">
                    {savingLead ? <Loader2 size={13} className="animate-spin" /> : null}
                    Save lead
                  </Button>
                </div>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Admin notes</span>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes about this lead"
                />
              </label>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Service requests</h3>
                {detail.requests.length === 0 && (
                  <p className="text-sm text-muted-foreground">No service requests submitted yet.</p>
                )}
                {detail.requests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{formatDate(req.created_at)}</span>
                      <label className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Status</span>
                        <select
                          value={req.status}
                          disabled={savingRequestId === req.id}
                          onChange={(e) => changeRequestStatus(req, e.target.value as "new" | "seen" | "handled")}
                          className="h-7 rounded-lg border border-input bg-background px-2 text-xs"
                        >
                          {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="mt-2 os-scroll-x">
                      <table className="w-full min-w-[420px] text-sm">
                        <thead className="border-b border-border text-left text-xs text-muted-foreground">
                          <tr>
                            <th className="py-1 pr-3">Service</th>
                            <th className="py-1 pr-3">Qty</th>
                            <th className="py-1 pr-3">Cycle</th>
                            <th className="py-1 pr-3">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {req.items.map((item) => (
                            <tr key={item.id} className="border-b border-border/60">
                              <td className="py-1.5 pr-3">{item.name.ar}</td>
                              <td className="py-1.5 pr-3">{item.qty}</td>
                              <td className="py-1.5 pr-3">{item.billing_cycle}</td>
                              <td className="py-1.5 pr-3">
                                {item.price_max ? `₪${item.price_min}–${item.price_max}` : `₪${item.price_min}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      {Object.entries(req.totals).map(([cycle, total]) => total && (
                        <div key={cycle} className="flex items-center justify-between font-medium">
                          <span>{cycle}</span>
                          <span>{total.min === total.max ? `₪${total.min}` : `₪${total.min}–${total.max}`}</span>
                        </div>
                      ))}
                    </div>
                    {req.customer_notes && (
                      <p className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">{req.customer_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
