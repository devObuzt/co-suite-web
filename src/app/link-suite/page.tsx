"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { manzumaSession, type ManzumaOrg } from "@/lib/manzumaSession";

/**
 * ربط السوت ببزنس قرار صريح بينعمل مرة وحدة: هو اللي بيحدد حملات مين، وتوكنات
 * مين، وفاتورة مين. فما منخمّنه عن الزبون حتى لو كان عنده بزنس واحد.
 */
export default function LinkSuite() {
  const [orgs, setOrgs] = useState<ManzumaOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void manzumaSession().then((session) => {
      setOrgs(session?.organizations ?? []);
      setLoading(false);
    });
  }, []);

  async function link(orgId: string) {
    setBusy(true);
    setError("");
    try {
      await api.suites.linkOrganization(orgId);
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرنا نربط السوت");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg p-6" dir="rtl">
      <h1 className="text-2xl font-bold">اربط السوت ببزنسك</h1>
      <p className="mt-2 text-sm text-zinc-400">
        السوت بيصير استراتيجية هالبزنس: حملاته، وحساباته المربوطة، وفريقه.
      </p>

      {loading && <p className="mt-6 text-sm text-zinc-500">عم نقرا حسابك…</p>}

      {!loading &&
        orgs.map((org) => (
          <button
            key={org.id}
            disabled={busy}
            onClick={() => link(org.id)}
            className="mt-3 w-full rounded-xl border border-zinc-700 p-4 text-start hover:border-emerald-500 disabled:opacity-50"
          >
            <div className="font-bold">{org.name}</div>
            <div className="text-xs text-zinc-500">{org.role}</div>
          </button>
        ))}

      {!loading && orgs.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">
          ما لقينا بزنس على حسابك بالمنظومة. اعمل واحد من accounts.manzuma.app وبعدها ارجع.
        </p>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </main>
  );
}
