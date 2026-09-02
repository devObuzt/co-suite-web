"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, YouTubeChannel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function YouTubeCallbackPage() {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
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

  type Step = "exchanging" | "done" | "error";
  const [step, setStep] = useState<Step>("exchanging");
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (error) { setStep("error"); setErrorMsg(error); return; }
    if (!code || !suiteId) { setStep("error"); setErrorMsg("Missing parameters"); return; }

    // One channel, already chosen in Google's account picker — nothing left to select.
    api.connections.youtubeCallback(suiteId, code)
      .then((res) => {
        setChannel(res.channel);
        setStep("done");
        setTimeout(() => router.push(`/suite/${suiteId}/connections`), 2000);
      })
      .catch((e: unknown) => {
        setStep("error");
        setErrorMsg(e instanceof Error ? e.message : "YouTube connection failed");
      });
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connecting YouTube</CardTitle>
        <CardDescription>Linking the channel you picked to this suite.</CardDescription>
      </CardHeader>
      <CardContent>
        {step === "exchanging" && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 size={18} className="animate-spin text-indigo-400" />
            Confirming the channel with YouTube…
          </div>
        )}

        {step === "done" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-emerald-500">
              <CheckCircle2 size={18} /> Connected
            </div>
            {/* Named explicitly: the account chooser can hand back a different
                channel than the one the user meant, and the only safe moment to
                catch that is before anything is published. */}
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-medium text-foreground">{channel?.channel_title}</p>
              <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{channel?.channel_id}</p>
              {channel?.subscribers && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {channel.subscribers} subscribers · {channel.videos} videos
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Not the right channel? Disconnect and reconnect, choosing it in Google&apos;s picker.
            </p>
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
