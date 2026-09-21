"use client";

import { useEffect, useState } from "react";
import { api, type Suite } from "@/lib/api";
import { manzumaSession, type ManzumaOrg } from "@/lib/manzumaSession";

const ACCOUNTS = process.env.NEXT_PUBLIC_MANZUMA_ACCOUNTS_URL || "https://accounts.manzuma.app";

/**
 * Which suite belongs to which business.
 *
 * Both sides are the customer's to choose. An agency owner has a suite per
 * client, so guessing would put somebody else's client under this business —
 * and a business is where the connected accounts, the invoices and the
 * campaigns live.
 *
 * Creating a business happens on Manzuma itself, on purpose: accounts refuses
 * writes that come from another host, and that refusal is load-bearing.
 */
export default function LinkSuite() {
  const [orgs, setOrgs] = useState<ManzumaOrg[]>([]);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);
  const [suiteId, setSuiteId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function load() {
    setLoading(true);
    const [session, mine] = await Promise.all([
      manzumaSession(),
      api.suites.list().catch(() => [] as Suite[]),
    ]);
    setOrgs(session?.organizations ?? []);
    setSuites(mine);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const unlinked = suites.filter((s) => !s.organization_id);
  const linked = suites.filter((s) => s.organization_id);
  const takenOrgIds = new Set(linked.map((s) => s.organization_id));

  async function link(orgId: string) {
    if (!suiteId) {
      setError("اختار سوت أول.");
      return;
    }
    setBusy(orgId);
    setError("");
    try {
      await api.suites.linkOrganization(orgId, suiteId);
      const name = suites.find((s) => s.id === suiteId)?.name ?? "السوت";
      setDone(`انربط ${name} بـ${orgs.find((o) => o.id === orgId)?.name ?? "البزنس"}.`);
      setSuiteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرنا نربط السوت");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6" dir="rtl">
      <h1 className="text-2xl font-bold">اربط السوت ببزنسك</h1>
      <p className="mt-2 text-sm text-zinc-400">
        السوت بيصير استراتيجية هالبزنس: حملاته، وحساباته المربوطة، وفريقه. كل سوت إله بزنس واحد.
      </p>

      {loading && <p className="mt-6 text-sm text-zinc-500">عم نقرا حسابك…</p>}

      {!loading && (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-zinc-300">١. اختار السوت</h2>
            {unlinked.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">كل سوتاتك مربوطة ببزنسات.</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {unlinked.map((suite) => (
                  <button
                    key={suite.id}
                    onClick={() => setSuiteId(suite.id)}
                    className={`rounded-xl border p-3 text-start transition ${
                      suiteId === suite.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <div className="font-bold">{suite.name}</div>
                    <div className="text-xs text-zinc-500">{suite.status}</div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-zinc-300">٢. اختار البزنس</h2>
            <div className="mt-3 grid gap-2">
              {orgs.map((org) => {
                const taken = takenOrgIds.has(org.id);
                return (
                  <button
                    key={org.id}
                    disabled={taken || Boolean(busy) || !suiteId}
                    onClick={() => link(org.id)}
                    className="rounded-xl border border-zinc-700 p-3 text-start hover:border-emerald-500 disabled:opacity-40"
                  >
                    <div className="font-bold">{org.name}</div>
                    <div className="text-xs text-zinc-500">
                      {taken ? "إله سوت مربوط" : org.role}
                    </div>
                  </button>
                );
              })}
            </div>

            <a
              href={`${ACCOUNTS}/dashboard`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-emerald-400 underline"
            >
              اعمل بزنس جديد بالمنظومة، وبعدها ارجع وحدّث الصفحة
            </a>
          </section>

          {linked.length > 0 && (
            <section className="mt-10">
              <h2 className="text-sm font-semibold text-zinc-300">مربوطة</h2>
              <ul className="mt-2 space-y-1 text-sm text-zinc-500">
                {linked.map((suite) => (
                  <li key={suite.id}>
                    {suite.name} → {orgs.find((o) => o.id === suite.organization_id)?.name ?? suite.organization_id}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {done && <p className="mt-6 text-sm text-emerald-400">{done}</p>}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </main>
  );
}
