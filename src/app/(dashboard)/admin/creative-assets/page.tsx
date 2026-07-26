"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { api, API_BASE, CreativeAsset } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

// Media lives on R2 (absolute URL) or a local /static path in dev; resolve the
// latter against the API origin so previews load in both.
const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "");
const assetUrl = (a: CreativeAsset) =>
  /^https?:\/\//.test(a.storage_url) ? a.storage_url : `${API_ORIGIN}${a.storage_url}`;

const KINDS = [
  "sfx",
  "music",
  "transition",
  "visual_image",
  "visual_video",
  "transition_video",
] as const;

function mediaType(a: CreativeAsset): "audio" | "video" | "image" {
  const ct = (a.content_type || "").toLowerCase();
  if (ct.startsWith("audio")) return "audio";
  if (ct.startsWith("video")) return "video";
  if (ct.startsWith("image")) return "image";
  if (a.kind === "visual_image") return "image";
  if (a.kind === "visual_video" || a.kind === "transition_video") return "video";
  return "audio"; // sfx, music, transition
}

function AssetPreview({ asset }: { asset: CreativeAsset }) {
  const url = assetUrl(asset);
  const type = mediaType(asset);
  if (type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={asset.title}
        className="h-40 w-full rounded-md bg-muted object-cover"
        loading="lazy"
      />
    );
  }
  if (type === "video") {
    return <video src={url} controls preload="metadata" className="h-40 w-full rounded-md bg-black object-contain" />;
  }
  return (
    <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-md bg-muted px-3">
      <audio src={url} controls preload="none" className="w-full" />
    </div>
  );
}

function AssetCard({
  asset,
  busy,
  onSaveMeta,
  onToggleActive,
}: {
  asset: CreativeAsset;
  busy: boolean;
  onSaveMeta: (asset: CreativeAsset, title: string, tags: string[]) => void;
  onToggleActive: (asset: CreativeAsset, next: boolean) => void;
}) {
  const [title, setTitle] = useState(asset.title);
  const [tagText, setTagText] = useState((asset.tags || []).join(", "));

  // Re-sync drafts when the underlying asset changes (after a reload).
  useEffect(() => {
    setTitle(asset.title);
    setTagText((asset.tags || []).join(", "));
  }, [asset.id, asset.title, asset.tags]);

  const dirty =
    title.trim() !== asset.title ||
    tagText !== (asset.tags || []).join(", ");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <AssetPreview asset={asset} />
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className="font-mono text-[11px]">{asset.kind}</Badge>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {asset.duration_seconds ? <span>{asset.duration_seconds.toFixed(1)}s</span> : null}
          <span>used {asset.usage_count}×</span>
          <Badge variant={asset.active ? "outline" : "secondary"}>{asset.active ? "active" : "inactive"}</Badge>
        </div>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Title</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</span>
        <Input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="energy, business, ..." />
      </label>

      <div className="mt-auto flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 gap-1"
          disabled={busy || !dirty}
          onClick={() =>
            onSaveMeta(
              asset,
              title.trim() || asset.title,
              tagText.split(",").map((t) => t.trim()).filter(Boolean),
            )
          }
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={busy}
          onClick={() => onToggleActive(asset, !asset.active)}
        >
          {asset.active ? <EyeOff size={13} /> : <Eye size={13} />}
          {asset.active ? "Disable" : "Enable"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminCreativeAssetsPage() {
  const user = useAuthStore((s) => s.user);
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<string>("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Upload panel
  const [upKind, setUpKind] = useState<string>("sfx");
  const [upTitle, setUpTitle] = useState("");
  const [upFile, setUpFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAssets(await api.admin.creativeAssets(kind, status === "active"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load assets");
    } finally {
      setLoading(false);
    }
  }, [kind, status]);

  useEffect(() => {
    if (!user?.is_super_admin) return;
    setLoading(true);
    load();
  }, [user?.is_super_admin, load]);

  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    for (const a of assets) by[a.kind] = (by[a.kind] || 0) + 1;
    return by;
  }, [assets]);

  if (!user?.is_super_admin) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Super admin access required.
        </div>
      </main>
    );
  }

  async function saveMeta(asset: CreativeAsset, title: string, tags: string[]) {
    setBusyId(asset.id);
    setError(null);
    setNotice(null);
    try {
      await api.admin.updateCreativeAsset(asset.id, { title, tags });
      await load();
      setNotice("Asset updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(asset: CreativeAsset, next: boolean) {
    if (!next && !window.confirm(`Disable "${asset.title}"? Existing renders keep their files.`)) return;
    setBusyId(asset.id);
    setError(null);
    setNotice(null);
    try {
      await api.admin.updateCreativeAsset(asset.id, { active: next });
      await load();
      setNotice(next ? "Asset enabled." : "Asset disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setBusyId(null);
    }
  }

  async function upload() {
    if (!upFile) {
      setError("Choose a file to upload first.");
      return;
    }
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      await api.admin.uploadCreativeAsset({ kind: upKind, title: upTitle.trim() || upFile.name, file: upFile });
      setUpFile(null);
      setUpTitle("");
      await load();
      setNotice("Asset uploaded and auto-classified.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function seedBuiltins() {
    setSeeding(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.admin.seedCreativeBuiltins();
      await load();
      setNotice(res.seeded > 0 ? `Seeded ${res.seeded} built-in assets.` : "Built-in assets already synced.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="border-b border-border pb-5">
        <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Admin
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck size={16} /> Super admin</div>
        <h1 className="mt-1 text-3xl font-semibold">Creative Asset Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview, tag, enable/disable and add the sound effects, music and visual assets used by montage renders.
        </p>
      </header>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {/* Upload / seed panel */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Add asset</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Kind</span>
            <select
              value={upKind}
              onChange={(e) => setUpKind(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="grid flex-1 gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Title (optional)</span>
            <Input value={upTitle} onChange={(e) => setUpTitle(e.target.value)} placeholder="Defaults to the file name" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">File</span>
            <input
              type="file"
              accept="audio/*,video/*,image/*"
              onChange={(e) => setUpFile(e.target.files?.[0] ?? null)}
              className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button onClick={upload} disabled={uploading || !upFile} className="gap-2">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
            </Button>
            <Button variant="outline" onClick={seedBuiltins} disabled={seeding} className="gap-2">
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Seed built-ins
            </Button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">All kinds</option>
            {KINDS.map((k) => <option key={k} value={k}>{k}{counts[k] ? ` (${counts[k]})` : ""}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <span className="text-sm text-muted-foreground">{assets.length} asset{assets.length === 1 ? "" : "s"}</span>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading assets…
        </div>
      ) : assets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No {status} assets{kind ? ` of kind "${kind}"` : ""}.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              busy={busyId === asset.id}
              onSaveMeta={saveMeta}
              onToggleActive={toggleActive}
            />
          ))}
        </section>
      )}
    </main>
  );
}
