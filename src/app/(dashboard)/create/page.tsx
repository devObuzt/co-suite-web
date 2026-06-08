"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Link from "next/link";
import { api, GenerateContentRequest, GenerationStatus, Post } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Layers, Loader2, Sparkles, Video, Wand2 } from "lucide-react";

type ContentChoice = {
  label: string;
  content_type: GenerateContentRequest["content_type"];
  mode: GenerateContentRequest["mode"];
  icon: React.ReactNode;
};

const CHOICES: ContentChoice[] = [
  { label: "Quick post/ad", content_type: "mixed", mode: "quick", icon: <Sparkles size={16} /> },
  { label: "Create image", content_type: "image", mode: "image", icon: <ImageIcon size={16} /> },
  { label: "Create video", content_type: "video", mode: "video", icon: <Video size={16} /> },
  { label: "Carousel", content_type: "carousel", mode: "carousel", icon: <Layers size={16} /> },
];

export default function AccountCreatePage() {
  const { lang, dir } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [choice, setChoice] = useState<ContentChoice>(CHOICES[0]);
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState("");
  const [error, setError] = useState("");

  const isBusy = status?.status === "queued" || status?.status === "running" || status?.status === "retrying";
  const progress = Math.max(0, Math.min(100, status?.progress ?? 0));

  const placeholder = useMemo(() => {
    if (lang === "ar") return "مثال: اعمل منشور لصورة عن خدمة جديدة، بلغة واضحة ومريحة للعملاء.";
    if (lang === "he") return "לדוגמה: צור פוסט תמונה על שירות חדש, בשפה ברורה ונעימה ללקוחות.";
    return "Example: create a clear image post about a new service for customers.";
  }, [lang]);

  useEffect(() => {
    refreshPosts();
    api.content.accountGenerationStatus().then(setStatus).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isBusy) return;
    const timer = window.setInterval(async () => {
      const next = await api.content.accountGenerationStatus();
      setStatus(next);
      if (next.status === "completed" || next.status === "failed" || next.status === "waiting_provider_limit") {
        window.clearInterval(timer);
        refreshPosts();
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [isBusy]);

  async function refreshPosts() {
    setLoadingPosts(true);
    setPostsError("");
    try {
      setPosts(await api.content.listAccount());
    } catch (err) {
      setPostsError(err instanceof Error ? err.message : "Could not load recent generations.");
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function generate() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setError(lang === "ar" ? "اكتب شو بدك نولد أولًا." : lang === "he" ? "כתוב קודם מה תרצה שניצור." : "Write what you want to create first.");
      return;
    }
    setError("");
    try {
      const next = await api.content.generateAccount({
        count: 1,
        prompt: cleanPrompt,
        mode: choice.mode,
        content_type: choice.content_type,
        destination: "social",
        aspect_ratio: "Auto",
        model_tier: "auto",
        use_brand: false,
        language: lang,
      });
      setStatus(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" dir={dir}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3">Account create</Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create without a Suite</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Start generating before onboarding a business profile. Brand mode is off here; create a Suite when you want consistent business memory, brand assets, publishing, and analytics.
          </p>
        </div>
        <Link href="/suite/new">
          <Button variant="outline" className="gap-2">
            <Wand2 size={16} />
            Build a Suite
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>What should OneShare create?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {CHOICES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setChoice(item)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                    choice.label === item.label
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={placeholder}
              className="min-h-44 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/20"
            />

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
              Brand mode is disabled until you build or open a Suite.
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button onClick={generate} disabled={isBusy} className="w-full gap-2 sm:w-auto">
              {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isBusy ? "Generating..." : "Generate"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generation status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={status?.status === "failed" ? "destructive" : "outline"}>
                {status?.status || "idle"}
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="min-h-10 text-sm text-muted-foreground">
              {status?.message || "No active generation. Write a prompt and start when ready."}
            </p>
            {(status?.status === "waiting_provider_limit" || status?.status === "waiting_capacity") && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                Provider capacity is limited. The job is preserved so the user sees the waiting state instead of a silent failure.
              </div>
            )}
            {status?.error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {status.error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent account generations</h2>
          <Button variant="ghost" size="sm" onClick={refreshPosts}>Refresh</Button>
        </div>
        {loadingPosts ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-56 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : postsError ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-10 text-center text-sm text-amber-700 dark:text-amber-200">
            Could not load recent generations right now. The create form is still available when the API is connected.
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
            Generated content will appear here.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const firstMedia = post.media_urls?.[0];
  const isVideo = post.format === "video";
  return (
    <Card className="h-full">
      <div className="aspect-[4/3] bg-muted">
        {firstMedia ? (
          isVideo ? (
            <video src={firstMedia} className="h-full w-full object-cover" controls playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firstMedia} alt={post.topic || "Generated media"} className="h-full w-full object-cover" />
          )
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            {isVideo ? <Video size={32} /> : <ImageIcon size={32} />}
          </div>
        )}
      </div>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline">{post.format}</Badge>
          <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-medium text-foreground">{post.topic || "Generated post"}</h3>
        <p className="line-clamp-4 text-sm text-muted-foreground">{post.caption}</p>
        {post.hashtags?.length ? (
          <p className="line-clamp-1 text-xs text-primary">{post.hashtags.join(" ")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
