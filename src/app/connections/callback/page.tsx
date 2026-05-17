"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, MetaPage } from "@/lib/api";
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
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (error) { setStep("error"); setErrorMsg(error); return; }
    if (!code || !suiteId) { setStep("error"); setErrorMsg("Missing parameters"); return; }

    api.connections.metaCallback(suiteId, code)
      .then((res) => { setPages(res.pages); setStep("select-page"); })
      .catch((e: unknown) => { setStep("error"); setErrorMsg(e instanceof Error ? e.message : "Failed"); });
  }, []);

  async function selectPage(page: MetaPage) {
    if (!suiteId) return;
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
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 mb-4">
              Choose which Facebook Page to connect. The linked Instagram account (if any) will be connected automatically.
            </p>
            {pages.length === 0 && (
              <p className="text-zinc-500 text-sm">No pages found. Make sure you manage at least one Facebook Page.</p>
            )}
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => selectPage(page)}
                className="w-full flex items-center gap-3 p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors text-left"
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
