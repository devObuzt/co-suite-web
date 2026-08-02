"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { api, AdminUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, KeyRound, Loader2, Plus, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";

const APPROVALS = ["approved", "frozen", "funnel"] as const;

interface NewUser {
  email: string;
  full_name: string;
  password: string;
  is_super_admin: boolean;
  approval_status: string;
}

const EMPTY_NEW: NewUser = { email: "", full_name: "", password: "", is_super_admin: false, approval_status: "approved" };

export default function AdminUsersPage() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<NewUser>(EMPTY_NEW);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (q = "") => {
    setError(null);
    try {
      setUsers(await api.admin.users(q));
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!me?.is_super_admin) return;
    setLoading(true);
    load();
  }, [me?.is_super_admin, load]);

  const selectableIds = useMemo(
    () => users.filter((u) => u.id !== me?.id && u.is_active).map((u) => u.id),
    [users, me?.id],
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  if (!me?.is_super_admin) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Super admin access required.
        </div>
      </main>
    );
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  async function patchUser(user: AdminUser, patch: Partial<AdminUser>) {
    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      await api.admin.updateUser(user.id, patch);
      await load(query);
      setNotice("User updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(user: AdminUser) {
    const password = window.prompt(`New password for ${user.email} (min 8 chars):`);
    if (!password) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      await api.admin.changePassword(user.id, password);
      setNotice(`Password reset for ${user.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setBusyId(null);
    }
  }

  async function deactivate(user: AdminUser) {
    if (!window.confirm(`Deactivate ${user.email}?`)) return;
    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      await api.admin.deactivateUser(user.id);
      await load(query);
      setNotice("User deactivated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed");
    } finally {
      setBusyId(null);
    }
  }

  async function bulkDeactivate() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`Deactivate ${ids.length} selected user${ids.length === 1 ? "" : "s"}?`)) return;
    setBulkBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.admin.bulkDeactivateUsers(ids);
      await load(query);
      setNotice(`Deactivated ${res.deactivated} user${res.deactivated === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk deactivate failed");
    } finally {
      setBulkBusy(false);
    }
  }

  async function createUser() {
    if (!form.email.trim() || !form.full_name.trim() || form.password.length < 8) {
      setError("Email, name and a password of at least 8 characters are required.");
      return;
    }
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      await api.admin.createUser({
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        password: form.password,
        is_super_admin: form.is_super_admin,
        approval_status: form.approval_status,
      });
      setForm(EMPTY_NEW);
      setShowAdd(false);
      await load(query);
      setNotice("User created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Admin
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck size={16} /> Super admin</div>
          <h1 className="mt-1 text-3xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage accounts: roles, approval, passwords, and deactivation.</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)} className="gap-2"><UserPlus size={14} /> Add user</Button>
      </header>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {showAdd && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">New user</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Full name</span>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Password (min 8)</span>
              <Input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Approval</span>
              <select
                value={form.approval_status}
                onChange={(e) => setForm((f) => ({ ...f, approval_status: e.target.value }))}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                {APPROVALS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" checked={form.is_super_admin} onChange={(e) => setForm((f) => ({ ...f, is_super_admin: e.target.checked }))} />
              <span className="font-medium">Super admin</span>
            </label>
            <div className="flex items-end">
              <Button onClick={createUser} disabled={creating} className="gap-2">
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Search + bulk bar */}
      <section className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => { e.preventDefault(); setLoading(true); load(query); }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email or name" className="w-64 pl-8" />
          </div>
          <Button type="submit" size="sm" variant="outline">Search</Button>
        </form>
        <span className="text-sm text-muted-foreground">{users.length} user{users.length === 1 ? "" : "s"}</span>
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
            <span className="text-sm text-red-700">{selected.size} selected</span>
            <Button size="sm" variant="destructive" onClick={bulkDeactivate} disabled={bulkBusy} className="gap-1">
              {bulkBusy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Deactivate selected
            </Button>
          </div>
        )}
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Loading users…</div>
      ) : (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="os-scroll-x">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" disabled={selectableIds.length === 0} />
                  </th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Suites</th>
                  <th className="py-2 pr-3">Approval</th>
                  <th className="py-2 pr-3">Roles</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-3">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleOne(u.id)}
                          disabled={isSelf || !u.is_active}
                          aria-label={`Select ${u.email}`}
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium">{u.full_name || "—"} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{u.email}</div>
                        {!u.is_active && <Badge variant="secondary" className="mt-1">inactive</Badge>}
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{u.suite_count ?? 0}</td>
                      <td className="py-3 pr-3">
                        <select
                          value={u.approval_status || "frozen"}
                          onChange={(e) => patchUser(u, { approval_status: e.target.value })}
                          disabled={busyId === u.id}
                          className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                        >
                          {APPROVALS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-xs">
                            <input type="checkbox" checked={u.is_active} disabled={busyId === u.id || isSelf} onChange={(e) => patchUser(u, { is_active: e.target.checked })} /> active
                          </label>
                          <label className="flex items-center gap-1.5 text-xs">
                            <input type="checkbox" checked={u.is_verified} disabled={busyId === u.id} onChange={(e) => patchUser(u, { is_verified: e.target.checked })} /> verified
                          </label>
                          <label className="flex items-center gap-1.5 text-xs">
                            <input type="checkbox" checked={u.is_super_admin} disabled={busyId === u.id || isSelf} onChange={(e) => patchUser(u, { is_super_admin: e.target.checked })} /> super admin
                          </label>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="gap-1" disabled={busyId === u.id} onClick={() => resetPassword(u)}>
                            <KeyRound size={13} /> Password
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1" disabled={busyId === u.id || isSelf || !u.is_active} onClick={() => deactivate(u)}>
                            {busyId === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Deactivate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
