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
  const [generatedPlan, setGeneratedPlan] = useState<SocialLoop | null>(null);
  const [draft, setDraft] = useState<SocialLoop | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.suites.loops(id).then((res) => {
      setLoops(res.loops || []);
      setSuggestions(res.suggestions);
      setGeneratedPlan(res.generated_plan);
    });
  }, [id]);

  function startNew() {
    if (!suggestions && !generatedPlan) return;
    setDraft({
      ...(generatedPlan || {}),
      name: generatedPlan?.name || "Main social content plan",
      status: "draft",
      content_mix: generatedPlan?.content_mix || suggestions?.content_mix || [],
      divisions: generatedPlan?.divisions || suggestions?.divisions || [],
      formats: generatedPlan?.formats || suggestions?.formats || [],
      cadence: generatedPlan?.cadence || { posts_per_week: 3, preferred_days: ["Monday", "Wednesday"], preferred_hours: ["10:00", "19:00"] },
      notes: generatedPlan?.notes || "",
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

  function linesToList(value: string) {
    return value.split("\n").map((item) => item.trim()).filter(Boolean);
  }

  function updateCadence(key: string, value: unknown) {
    if (!draft) return;
    setDraft({ ...draft, cadence: { ...(draft.cadence || {}), [key]: value } });
  }

  function updateApprovalFlow(key: string, value: unknown) {
    if (!draft) return;
    setDraft({ ...draft, approval_flow: { ...(draft.approval_flow || {}), [key]: value } });
  }

  function updateSchedulingHandoff(key: string, value: unknown) {
    if (!draft) return;
    setDraft({ ...draft, scheduling_handoff: { ...(draft.scheduling_handoff || {}), [key]: value } });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-5 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/suite/${id}`} className="text-zinc-500 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Social content plan</h1>
            <p className="mt-1 text-sm text-zinc-500">Build repeatable content systems for pillars, cadence, approvals, and scheduling handoff.</p>
          </div>
        </div>
        <Button onClick={startNew} className="gap-2 bg-indigo-600 hover:bg-indigo-500">
          <Plus size={14} /> Generate plan
        </Button>
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        {loops.length === 0 && (
          <Card className="border-dashed border-zinc-800 bg-zinc-950 text-zinc-400">
            <CardContent className="p-6 text-sm">No plans yet. Generate one from Suite profile and edit it before scheduling.</CardContent>
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
                <p className="mt-1 text-xs text-zinc-500">{loop.content_pillars?.length || loop.content_mix?.length || 0} pillars · {loop.formats?.filter((f) => f.enabled).length || 0} formats</p>
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
              <CardTitle className="text-base">Plan setup</CardTitle>
              <Button onClick={save} disabled={saving} className="gap-2 bg-emerald-700 hover:bg-emerald-600">
                <Save size={14} /> {saving ? "Saving..." : "Save plan"}
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
              <h2 className="text-sm font-semibold text-zinc-200">1. Content pillars</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(draft.content_pillars || []).map((pillar, idx) => (
                  <div key={`${pillar.name}-${idx}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={pillar.name}
                        onChange={(e) => {
                          const next = [...(draft.content_pillars || [])];
                          next[idx] = { ...pillar, name: e.target.value };
                          setDraft({ ...draft, content_pillars: next });
                        }}
                        className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none"
                        dir="auto"
                      />
                      <input
                        type="number"
                        value={pillar.percentage || 0}
                        onChange={(e) => {
                          const next = [...(draft.content_pillars || [])];
                          next[idx] = { ...pillar, percentage: Number(e.target.value) };
                          setDraft({ ...draft, content_pillars: next });
                        }}
                        className="h-8 w-16 rounded border border-zinc-800 bg-black px-2 text-xs text-zinc-200"
                      />
                    </div>
                    <textarea
                      value={pillar.notes || ""}
                      onChange={(e) => {
                        const next = [...(draft.content_pillars || [])];
                        next[idx] = { ...pillar, notes: e.target.value };
                        setDraft({ ...draft, content_pillars: next });
                      }}
                      rows={2}
                      className="mt-2 w-full resize-none rounded border border-zinc-800 bg-black px-2 py-1 text-xs text-zinc-300 outline-none"
                      dir="auto"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-zinc-200">2. Cadence and platforms</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">Posts per week</span>
                  <input
                    type="number"
                    value={Number(draft.cadence?.posts_per_week || 0)}
                    onChange={(e) => updateCadence("posts_per_week", Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">Review buffer hours</span>
                  <input
                    type="number"
                    value={Number(draft.cadence?.review_buffer_hours || 0)}
                    onChange={(e) => updateCadence("review_buffer_hours", Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">Preferred days</span>
                  <textarea
                    value={((draft.cadence?.preferred_days as string[]) || []).join("\n")}
                    onChange={(e) => updateCadence("preferred_days", linesToList(e.target.value))}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">Platforms</span>
                  <textarea
                    value={(draft.platforms || []).join("\n")}
                    onChange={(e) => setDraft({ ...draft, platforms: linesToList(e.target.value) })}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-zinc-200">3. Content types and ratio</h2>
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
              <h2 className="text-sm font-semibold text-zinc-200">4. Included divisions/groups</h2>
              <textarea
                value={(draft.divisions || []).join("\n")}
                onChange={(e) => setDraft({ ...draft, divisions: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
                rows={5}
                className="mt-3 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                dir="auto"
              />
            </section>

            <section>
              <h2 className="text-sm font-semibold text-zinc-200">5. Formats and languages</h2>
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
                <label className="block space-y-1 rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:col-span-2">
                  <span className="text-xs text-zinc-500">Languages</span>
                  <textarea
                    value={(draft.languages || []).join("\n")}
                    onChange={(e) => setDraft({ ...draft, languages: linesToList(e.target.value) })}
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm text-zinc-100 outline-none"
                    dir="auto"
                  />
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-zinc-200">6. Approval flow and scheduling handoff</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.approval_flow?.required ?? true)}
                    onChange={(e) => updateApprovalFlow("required", e.target.checked)}
                  />
                  Owner approval required
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">Handoff status</span>
                  <input
                    value={String(draft.scheduling_handoff?.status || "ready_for_calendar")}
                    onChange={(e) => updateSchedulingHandoff("status", e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">Approval steps</span>
                  <textarea
                    value={((draft.approval_flow?.steps as string[]) || []).join("\n")}
                    onChange={(e) => updateApprovalFlow("steps", linesToList(e.target.value))}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">Scheduling notes</span>
                  <textarea
                    value={String(draft.scheduling_handoff?.notes || "")}
                    onChange={(e) => updateSchedulingHandoff("notes", e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                    dir="auto"
                  />
                </label>
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
