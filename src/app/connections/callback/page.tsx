"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, MetaAdAccount, MetaPage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function MetaCallbackPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Suspense fallback={
        <Card className="bg-zinc-900 border-zinc-800 text-white w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-zinc-400">
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

  type Step = "exchanging" | "select-page" | "saving" | "done" | "error";
  const [step, setStep] = useState<Step>("exchanging");
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedAdAccountId, setSelectedAdAccountId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (error) { setStep("error"); setErrorMsg(error); return; }
    if (!code || !suiteId) { setStep("error"); setErrorMsg("Missing parameters"); return; }

    api.connections.metaCallback(suiteId, code)
      .then((res) => {
        setPages(res.pages);
        setAdAccounts(res.ad_accounts || []);
        setSelectedPageId(res.pages[0]?.id || "");
        setSelectedAdAccountId((res.ad_accounts || [])[0]?.id || "");
        setStep("select-page");
      })
      .catch((e: unknown) => { setStep("error"); setErrorMsg(e instanceof Error ? e.message : "Failed"); });
  }, []);

  async function saveSelection() {
    if (!suiteId) return;
    const page = pages.find((p) => p.id === selectedPageId);
    if (!page) {
      setStep("error");
      setErrorMsg("Choose a Facebook Page");
      return;
    }
    const adAccount = adAccounts.find((a) => a.id === selectedAdAccountId);
    setStep("saving");
    try {
      const ig = page.instagram_business_account;
      await api.connections.metaSelectPage({
        suite_id: suiteId,
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token,
        ig_user_id: ig?.id,
        ig_username: ig?.username,
        ad_account_id: adAccount?.id,
        ad_account_name: adAccount?.name,
        ad_account_currency: adAccount?.currency,
      });
      setStep("done");
      setTimeout(() => router.push(`/suite/${suiteId}`), 1500);
    } catch (e: unknown) {
      setStep("error");
      setErrorMsg(e instanceof Error ? e.message : "Failed to save");
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 text-white w-full max-w-md">
      <CardHeader>
        <CardTitle>Connecting to Meta</CardTitle>
        <CardDescription className="text-zinc-400">Facebook &amp; Instagram</CardDescription>
      </CardHeader>
      <CardContent>
        {step === "exchanging" && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 size={18} className="animate-spin text-indigo-400" />
            Exchanging token…
          </div>
        )}

        {step === "select-page" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400 mb-4">
              Choose the Facebook Page and Meta Ads account to connect.
            </p>
            {pages.length === 0 && (
              <p className="text-zinc-500 text-sm">No pages found. Make sure you manage at least one Facebook Page.</p>
            )}
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Facebook Page</div>
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setSelectedPageId(page.id)}
                  className={`w-full flex items-center gap-3 p-4 border rounded-lg transition-colors text-left ${
                    selectedPageId === page.id
                      ? "bg-indigo-950/60 border-indigo-700"
                      : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {page.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{page.name}</div>
                    {page.instagram_business_account && (
                      <div className="text-zinc-400 text-xs">+ @{page.instagram_business_account.username}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Meta Ads Account</div>
              {adAccounts.length === 0 ? (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                  No ad accounts returned. You can connect the page now and add ads access later.
                </p>
              ) : (
                adAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAdAccountId(account.id)}
                    className={`w-full p-3 border rounded-lg transition-colors text-left ${
                      selectedAdAccountId === account.id
                        ? "bg-blue-950/60 border-blue-700"
                        : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <div className="text-white text-sm font-medium truncate">{account.name || account.id}</div>
                    <div className="text-zinc-500 text-xs mt-0.5">
                      {account.currency || "Currency unknown"}{account.business?.name ? ` · ${account.business.name}` : ""}
                    </div>
                  </button>
                ))
              )}
            </div>

            <Button onClick={saveSelection} className="w-full bg-indigo-600 hover:bg-indigo-500">
              Save connection
            </Button>
          </div>
        )}

        {step === "saving" && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 size={18} className="animate-spin text-indigo-400" />
            Saving connection…
          </div>
        )}

        {step === "done" && (
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 size={18} /> Connected! Redirecting…
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle size={18} />
              <span className="text-sm">{errorMsg}</span>
            </div>
            <Button variant="outline" onClick={() => router.back()} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Go back
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
