"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, SocialLoop, SocialLoopSuggestions } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Save } from "lucide-react";

export default function SocialLoopsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loops, setLoops] = useState<SocialLoop[]>([]);
  const [suggestions, setSuggestions] = useState<SocialLoopSuggestions | null>(null);
  const [draft, setDraft] = useState<SocialLoop | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.suites.loops(id).then((res) => {
      setLoops(res.loops || []);
      setSuggestions(res.suggestions);
    });
  }, [id]);

  function startNew() {
    if (!suggestions) return;
    setDraft({
      name: "Main social loop",
      status: "draft",
      content_mix: suggestions.content_mix,
      divisions: suggestions.divisions,
      formats: suggestions.formats,
      cadence: { posts_per_week: 3, preferred_hours: ["10:00", "19:00"] },
      notes: "",
    });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await api.suites.saveLoop(id, draft);
      setLoops(res.loops);
      setDraft(res.loop);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-5 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/suite/${id}`} className="text-zinc-500 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Social loops</h1>
            <p className="mt-1 text-sm text-zinc-500">Build repeatable content systems for publishing rhythm, formats, and themes.</p>
          </div>
        </div>
        <Button onClick={startNew} className="gap-2 bg-indigo-600 hover:bg-indigo-500">
          <Plus size={14} /> New loop
        </Button>
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        {loops.length === 0 && (
          <Card className="border-dashed border-zinc-800 bg-zinc-950 text-zinc-400">
            <CardContent className="p-6 text-sm">No loops yet. Create one from co-Suite suggestions.</CardContent>
          </Card>
        )}
        {loops.map((loop) => (
          <button
            key={loop.id || loop.name}
            type="button"
            onClick={() => setDraft(loop)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:border-zinc-600"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white" dir="auto">{loop.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{loop.content_mix?.length || 0} content types · {loop.formats?.filter((f) => f.enabled).length || 0} formats</p>
              </div>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">{loop.status || "draft"}</Badge>
            </div>
          </button>
        ))}
      </section>

      {draft && (
        <Card className="border-zinc-800 bg-zinc-900 text-white">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Loop setup</CardTitle>
              <Button onClick={save} disabled={saving} className="gap-2 bg-emerald-700 hover:bg-emerald-600">
                <Save size={14} /> {saving ? "Saving..." : "Save loop"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
              />
            </label>

            <section>
              <h2 className="text-sm font-semibold text-zinc-200">1. Content types and ratio</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(draft.content_mix || []).map((item, idx) => (
                  <div key={item.type} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={item.label || item.type}
                        onChange={(e) => {
                          const next = [...(draft.content_mix || [])];
                          next[idx] = { ...item, label: e.target.value };
                          setDraft({ ...draft, content_mix: next });
                        }}
                        className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none"
                      />
                      <input
                        type="number"
                        value={item.percentage}
                        onChange={(e) => {
                          const next = [...(draft.content_mix || [])];
                          next[idx] = { ...item, percentage: Number(e.target.value) };
                          setDraft({ ...draft, content_mix: next });
                        }}
                        className="h-8 w-16 rounded border border-zinc-800 bg-black px-2 text-xs text-zinc-200"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-zinc-200">2. Included divisions/groups</h2>
              <textarea
                value={(draft.divisions || []).join("\n")}
                onChange={(e) => setDraft({ ...draft, divisions: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
                rows={5}
                className="mt-3 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                dir="auto"
              />
            </section>

            <section>
              <h2 className="text-sm font-semibold text-zinc-200">3. Formats</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(draft.formats || []).map((format, idx) => (
                  <label key={format.type} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={format.enabled}
                      onChange={(e) => {
                        const next = [...(draft.formats || [])];
                        next[idx] = { ...format, enabled: e.target.checked };
                        setDraft({ ...draft, formats: next });
                      }}
                    />
                    {format.label || format.type}
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-zinc-200">Notes</h2>
              <textarea
                value={draft.notes || ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={3}
                placeholder="Anything this loop should follow?"
                className="mt-3 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                dir="auto"
              />
            </section>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
