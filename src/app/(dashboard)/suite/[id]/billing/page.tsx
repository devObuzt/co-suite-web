"use client";
import { use, useEffect, useState } from "react";
import { api, Subscription, UsageEvent } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard, AlertTriangle, CheckCircle2, Zap, TrendingDown,
  Users, RefreshCw, Loader2,
} from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  solo: "Solo",
  team: "Team",
  enterprise: "Enterprise",
};

const EVENT_LABELS: Record<string, string> = {
  llm_idea_gen: "AI content ideas",
  image_gen: "Image generation",
  video_gen_fast: "Video generation",
  brand_extract: "Brand extraction",
};

export default function BillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [s, u] = await Promise.all([api.billing.get(id), api.billing.usage(id)]);
    setSub(s);
    setUsage(u);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  async function handleSubscribe() {
    setBusy(true);
    try {
      const { url } = await api.billing.subscribeUrl(id);
      window.open(url, "_blank");
    } finally {
      setBusy(false);
    }
  }

  async function handlePayBalance() {
    setBusy(true);
    try {
      const { url } = await api.billing.payUrl(id);
      window.open(url, "_blank");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Nothing to pay");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleAutoPay() {
    if (!sub) return;
    await api.billing.toggleAutoPay(id, !sub.auto_pay_enabled);
    await load();
  }

  if (loading) return <div className="p-8 text-zinc-400">Loading…</div>;
  if (!sub) return <div className="p-8 text-red-400">Could not load billing</div>;

  const isFrozen = sub.status === "frozen";
  const balanceNegative = sub.credit_balance < 0;
  const balanceColor = isFrozen
    ? "text-red-400"
    : balanceNegative
    ? "text-amber-400"
    : "text-emerald-400";

  // Usage totals
  const totalActual = usage.reduce((s, e) => s + e.actual_cost_usd, 0);
  const totalBilled = usage.reduce((s, e) => s + e.billed_amount, 0);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your subscription and usage credits</p>
      </div>

      {/* Frozen alert */}
      {isFrozen && (
        <div className="flex items-start gap-3 bg-red-950/50 border border-red-800 rounded-xl p-4">
          <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium text-sm">Suite frozen</p>
            <p className="text-red-400 text-sm mt-0.5">
              Your credit balance reached ${Math.abs(sub.freeze_threshold).toFixed(2)}.
              Pay your balance to reactivate content generation and publishing.
            </p>
            <Button
              onClick={handlePayBalance}
              disabled={busy}
              className="mt-3 bg-red-700 hover:bg-red-600 gap-2 h-8 text-xs"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
              Pay balance now
            </Button>
          </div>
        </div>
      )}

      {/* Plan + balance */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Current plan */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-zinc-400 font-normal flex items-center gap-2">
              <Users size={14} /> Current plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div>
                <div className="text-2xl font-bold text-white">${sub.price_per_seat.toFixed(2)}</div>
                <div className="text-zinc-400 text-xs">per user / month</div>
              </div>
              <Badge className="mb-1 bg-indigo-950 text-indigo-300 border-indigo-800 border" variant="outline">
                {TIER_LABELS[sub.tier]}
              </Badge>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Seats</span>
                <span className="text-white">{sub.seat_count}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Monthly total</span>
                <span className="text-white font-medium">${sub.monthly_total.toFixed(2)}</span>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            <div className="text-xs text-zinc-500 space-y-1">
              <p>Solo (1 seat) — $14.99/seat</p>
              <p>Team (2-24 seats) — $11.99/seat</p>
              <p>Enterprise (25+ seats) — $7.99/seat</p>
            </div>

            <Button
              onClick={handleSubscribe}
              disabled={busy}
              className="w-full bg-indigo-600 hover:bg-indigo-500 gap-2 h-9 text-sm"
            >
              <CreditCard size={14} /> Manage subscription
            </Button>
          </CardContent>
        </Card>

        {/* Credit balance */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-zinc-400 font-normal flex items-center gap-2">
              <TrendingDown size={14} /> AI usage credits
            </CardTitle>
            <CardDescription className="text-zinc-500 text-xs">
              API costs are billed at 3× actual cost
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className={`text-3xl font-bold ${balanceColor}`}>
                {sub.credit_balance >= 0 ? "+" : ""}${sub.credit_balance.toFixed(2)}
              </div>
              <div className="text-zinc-500 text-xs mt-0.5">
                {isFrozen ? "Account frozen" : balanceNegative ? `Freeze at $${sub.freeze_threshold.toFixed(2)}` : "Balance is positive"}
              </div>
            </div>

            <div className="bg-zinc-800 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Actual API spend</span>
                <span>${totalActual.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Billed (3×)</span>
                <span className="text-white">${totalBilled.toFixed(4)}</span>
              </div>
            </div>

            {balanceNegative && (
              <Button
                onClick={handlePayBalance}
                disabled={busy}
                className="w-full bg-amber-700 hover:bg-amber-600 gap-2 h-9 text-sm"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                Pay ${Math.abs(sub.credit_balance).toFixed(2)}
              </Button>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-400">Auto-pay when frozen</div>
              <button
                onClick={handleToggleAutoPay}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  sub.auto_pay_enabled ? "bg-indigo-600" : "bg-zinc-700"
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  sub.auto_pay_enabled ? "translate-x-4" : "translate-x-0.5"
                }`} />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage history */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-zinc-400 font-normal flex items-center gap-2">
              <Zap size={14} /> Usage history
            </CardTitle>
            <button onClick={load} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">No usage events yet — generate some content to see costs here</p>
          ) : (
            <div className="space-y-0">
              {usage.slice(0, 20).map((ev, i) => (
                <div key={ev.id}>
                  {i > 0 && <Separator className="bg-zinc-800" />}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-white text-sm">
                        {EVENT_LABELS[ev.event_type] || ev.event_type}
                      </div>
                      <div className="text-zinc-500 text-xs">
                        {new Date(ev.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-400 text-sm font-medium">
                        -${ev.billed_amount.toFixed(4)}
                      </div>
                      <div className="text-zinc-600 text-xs">
                        actual ${ev.actual_cost_usd.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
