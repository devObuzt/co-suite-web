"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, GoogleAdsCustomer } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function GoogleAdsCallbackPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 size={18} className="animate-spin text-indigo-400" />
              Loading…
            </div>
          </CardContent>
        </Card>
      }>
        <CallbackInner />
      </Suspense>
    </div>
  );
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const suiteId = params.get("state");
  const error = params.get("error");

  type Step = "exchanging" | "select-customer" | "saving" | "done" | "error";
  const [step, setStep] = useState<Step>("exchanging");
  const [customers, setCustomers] = useState<GoogleAdsCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (error) { setStep("error"); setErrorMsg(error); return; }
    if (!code || !suiteId) { setStep("error"); setErrorMsg("Missing parameters"); return; }

    api.connections.googleCallback(suiteId, code)
      .then((res) => {
        setCustomers(res.customers || []);
        setSelectedCustomerId((res.customers || [])[0]?.id || "");
        setStep("select-customer");
      })
      .catch((e: unknown) => {
        setStep("error");
        setErrorMsg(e instanceof Error ? e.message : "Google Ads connection failed");
      });
  }, []);

  async function saveSelection() {
    if (!suiteId || !selectedCustomerId) return;
    const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
    setStep("saving");
    try {
      await api.connections.googleSelectCustomer({
        suite_id: suiteId,
        customer_id: selectedCustomerId,
        customer_name: selectedCustomer?.name || selectedCustomerId,
      });
      setStep("done");
      setTimeout(() => router.push(`/suite/${suiteId}`), 1200);
    } catch (e: unknown) {
      setStep("error");
      setErrorMsg(e instanceof Error ? e.message : "Failed to save Google Ads account");
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connecting Google Ads</CardTitle>
        <CardDescription>Choose the ad account to read campaigns from.</CardDescription>
      </CardHeader>
      <CardContent>
        {step === "exchanging" && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 size={18} className="animate-spin text-indigo-400" />
            Exchanging Google token…
          </div>
        )}

        {step === "select-customer" && (
          <div className="space-y-4">
            {customers.length === 0 ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-100">
                No Google Ads accounts returned. Make sure this Google user has access to a Google Ads account.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Google Ads Account</div>
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedCustomerId === customer.id
                        ? "border-indigo-600 bg-indigo-500/10"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    <div className="text-sm font-medium text-foreground">
                      {customer.name || customer.id}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{customer.id}</span>
                      {customer.currency_code && <span>{customer.currency_code}</span>}
                      {customer.time_zone && <span>{customer.time_zone}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button onClick={saveSelection} disabled={!selectedCustomerId} className="w-full">
              Save Google Ads connection
            </Button>
          </div>
        )}

        {step === "saving" && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 size={18} className="animate-spin text-indigo-400" />
            Saving connection…
          </div>
        )}

        {step === "done" && (
          <div className="flex items-center gap-3 text-emerald-500">
            <CheckCircle2 size={18} /> Connected! Redirecting…
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle size={18} />
              <span className="text-sm">{errorMsg}</span>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              Go back
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
