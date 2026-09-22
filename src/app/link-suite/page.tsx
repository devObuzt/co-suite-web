"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Suite } from "@/lib/api";
import { manzumaSession, type ManzumaOrg } from "@/lib/manzumaSession";

const ACCOUNTS = process.env.NEXT_PUBLIC_MANZUMA_ACCOUNTS_URL || "https://accounts.manzuma.app";

/**
 * Which suite belongs to which business — one question per screen.
 *
 * Both sides are the customer's to choose: an agency owner has a suite per
 * client, and a business is where that client's connected accounts, invoices
 * and campaigns live. Putting both lists on one screen made a two-part
 * decision look like a single button.
 *
 * A suite with no business yet gets one from here in a single press. The
 * write still happens at accounts — co-Suite's server asks it with the user id
 * from the verified session — so the browser never writes across hosts, which
 * is the refusal that keeps other people's businesses out of reach.
 */
export default function LinkSuite() {
  const [orgs, setOrgs] = useState<ManzumaOrg[]>([]);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState<Suite | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [creating, setCreating] = useState(false);
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

  const unlinked = useMemo(() => suites.filter((s) => !s.organization_id), [suites]);
  const linked = useMemo(() => suites.filter((s) => s.organization_id), [suites]);
  const takenOrgIds = useMemo(
    () => new Set(linked.map((s) => s.organization_id)),
    [linked],
  );

  // One search box serves whichever step is on screen; it clears between them
  // so a suite name never hides every business.
  const needle = query.trim().toLowerCase();
  const suiteMatches = unlinked.filter((s) => s.name.toLowerCase().includes(needle));
  const orgMatches = orgs.filter((o) => o.name.toLowerCase().includes(needle));

  function pickSuite(suite: Suite) {
    setChosen(suite);
    setQuery("");
    setError("");
    setDone("");
  }

  function back() {
    setChosen(null);
    setQuery("");
    setError("");
  }

  /** The common case for an agency: this suite is a client with no business yet. */
  async function createAndLink() {
    if (!chosen) return;
    setCreating(true);
    setError("");
    try {
      const res = await api.suites.createBusiness(chosen.id);
      setDone(`انعمل بزنس «${res.organization.name}» وانربط فيه ${chosen.name}.`);
      setChosen(null);
      setQuery("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرنا نعمل البزنس");
    } finally {
      setCreating(false);
    }
  }

  async function link(org: ManzumaOrg) {
    if (!chosen) return;
    setBusy(org.id);
    setError("");
    try {
      await api.suites.linkOrganization(org.id, chosen.id);
      setDone(`انربط ${chosen.name} بـ${org.name}.`);
      setChosen(null);
      setQuery("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرنا نربط السوت");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6" dir="rtl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">{chosen ? "لأي بزنس؟" : "أي سوت بدك تربط؟"}</h1>
        <span className="text-xs text-zinc-500">{chosen ? "خطوة ٢ من ٢" : "خطوة ١ من ٢"}</span>
      </div>

      <p className="mt-2 text-sm text-zinc-400">
        {chosen
          ? `«${chosen.name}» رح يصير استراتيجية البزنس اللي بتختاره: حملاته، وحساباته المربوطة، وفريقه.`
          : "كل سوت إله بزنس واحد. اختار السوت، وبالشاشة الجاية بتختارله البزنس."}
      </p>

      {loading && <p className="mt-6 text-sm text-zinc-500">عم نقرا حسابك…</p>}

      {!loading && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={chosen ? "دوّر عن بزنس…" : "دوّر عن سوت…"}
            className="mt-6 w-full rounded-xl border border-zinc-700 bg-transparent px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />

          {!chosen && (
            <section className="mt-4 grid gap-2">
              {unlinked.length === 0 && (
                <p className="text-sm text-zinc-500">كل سوتاتك مربوطة ببزنسات.</p>
              )}
              {unlinked.length > 0 && suiteMatches.length === 0 && (
                <p className="text-sm text-zinc-500">ما في سوت بهالاسم.</p>
              )}
              {suiteMatches.map((suite) => (
                <button
                  key={suite.id}
                  onClick={() => pickSuite(suite)}
                  className="rounded-xl border border-zinc-700 p-3 text-start transition hover:border-emerald-500"
                >
                  <div className="font-bold">{suite.name}</div>
                  <div className="text-xs text-zinc-500">{suite.status}</div>
                </button>
              ))}
            </section>
          )}

          {chosen && (
            <section className="mt-4 grid gap-2">
              {orgMatches.length === 0 && (
                <p className="text-sm text-zinc-500">
                  {orgs.length === 0 ? "لسا ما عندك بزنسات." : "ما في بزنس بهالاسم."}
                </p>
              )}
              {orgMatches.map((org) => {
                const taken = takenOrgIds.has(org.id);
                return (
                  <button
                    key={org.id}
                    disabled={taken || Boolean(busy)}
                    onClick={() => link(org)}
                    className="rounded-xl border border-zinc-700 p-3 text-start transition hover:border-emerald-500 disabled:opacity-40"
                  >
                    <div className="font-bold">{org.name}</div>
                    <div className="text-xs text-zinc-500">
                      {taken ? "إله سوت مربوط" : busy === org.id ? "عم نربط…" : org.role}
                    </div>
                  </button>
                );
              })}

              <button
                disabled={creating || Boolean(busy)}
                onClick={() => void createAndLink()}
                className="mt-2 rounded-xl border border-dashed border-emerald-600 p-3 text-start text-sm text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-40"
              >
                {creating ? "عم نعمل البزنس…" : `+ اعمل بزنس جديد باسم «${chosen.name}» واربطه`}
              </button>

              <a
                href={`${ACCOUNTS}/dashboard`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 text-xs text-zinc-500 underline"
              >
                أو اعمله بنفسك بالمنظومة وارجع حدّث الصفحة
              </a>

              <button onClick={back} className="mt-4 text-sm text-zinc-400 hover:text-zinc-200">
                ← ارجع واختار سوت تاني
              </button>
            </section>
          )}

          {linked.length > 0 && (
            <section className="mt-10 border-t border-zinc-800 pt-6">
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
