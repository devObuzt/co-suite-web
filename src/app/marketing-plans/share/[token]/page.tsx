
"use client";

import { use, useEffect, useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { api, MarketingPlanDeck } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketingPlanView } from "@/components/marketing-plan/MarketingPlanView";

export default function PublicMarketingPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [deck, setDeck] = useState<MarketingPlanDeck | null>(null);
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.marketingPlans.publicGet(token);
        setLocked(Boolean(res.locked));
        setDeck(res.deck || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Marketing plan not found");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  async function unlock() {
    setSubmitting(true);
    setError("");
    try {
      const res = await api.marketingPlans.unlock(token, password);
      setDeck(res.deck || null);
      setLocked(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wrong password");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-background text-muted-foreground"><Loader2 className="animate-spin" /></main>;
  }

  if (locked) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-5">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <Lock className="mx-auto text-muted-foreground" />
          <h1 className="mt-3 text-xl font-bold text-foreground">Protected marketing plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter the password to view this client presentation.</p>
          <div className="mt-5 flex gap-2">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
            <Button onClick={unlock} disabled={submitting || !password}>{submitting ? <Loader2 className="animate-spin" size={16} /> : "Open"}</Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </main>
    );
  }

  if (!deck) {
    return <main className="grid min-h-screen place-items-center bg-background p-5 text-center text-muted-foreground">{error || "Marketing plan not found"}</main>;
  }

  return (
    <main className="bg-background px-4 py-6 sm:px-8">
      <div className="marketing-plan-controls mx-auto mb-4 flex max-w-6xl justify-end">
        <Button variant="outline" onClick={() => window.print()}>Download PDF</Button>
      </div>
      <div className="mx-auto max-w-6xl">
        <MarketingPlanView deck={deck} />
      </div>
    </main>
  );
}
