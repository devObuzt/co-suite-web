"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  ImageIcon,
  Loader2,
  PackageOpen,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { api, GenerationStatus, ProductBulkAsset, ProductBulkBatch, ProductBulkItem, ProductTemplateDirection } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_MEDIA = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8000";

type BusyAction =
  | "upload"
  | "generate-first"
  | "approve-template"
  | "generate-all"
  | `approve-${string}`
  | `reject-${string}`
  | `regenerate-${string}`;

const runningJobStatuses = new Set(["queued", "waiting_capacity", "waiting_provider_limit", "running", "retrying"]);
const runningBatchStatuses = new Set(["first_generating", "generating_all"]);

function isJobRunning(status: GenerationStatus | null) {
  return runningJobStatuses.has(status?.status || "");
}

function isBatchRunning(batch: ProductBulkBatch | null) {
  if (!batch) return false;
  if (runningBatchStatuses.has(batch.status)) return true;
  return batch.items.some((item) => item.status === "generating") || batch.assets.some((asset) => asset.status === "generating");
}

function mediaUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  return `${API_MEDIA}${url.startsWith("/") ? "" : "/"}${url}`;
}

function friendlyError(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong.";
}

function titleCaseStatus(status: string) {
  return status.replace(/_/g, " ");
}

function statusBadgeClass(status: string) {
  if (["completed", "generated", "approved", "approved_template"].includes(status)) {
    return "border-emerald-800 bg-emerald-950/50 text-emerald-300";
  }
  if (["failed", "rejected", "cancelled"].includes(status)) {
    return "border-red-900 bg-red-950/50 text-red-300";
  }
  if (["first_generating", "generating_all", "generating", "queued", "running", "retrying"].includes(status)) {
    return "border-indigo-800 bg-indigo-950/50 text-indigo-300";
  }
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

export default function ProductBulkStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [batches, setBatches] = useState<ProductBulkBatch[]>([]);
  const [batch, setBatch] = useState<ProductBulkBatch | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [creativePrompt, setCreativePrompt] = useState("");
  const [brandEnabled, setBrandEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [pollingRequested, setPollingRequested] = useState(false);
  const [feedbackByAsset, setFeedbackByAsset] = useState<Record<string, string>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadBatches = useCallback(async () => {
    const res = await api.productBulk.list(id);
    const sorted = [...(res.batches || [])].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
    setBatches(sorted);
    setBatch((current) => {
      if (current) return sorted.find((candidate) => candidate.id === current.id) || sorted[0] || null;
      return sorted[0] || null;
    });
  }, [id]);

  const refreshBatch = useCallback(async (options?: { settleIfIdle?: boolean }) => {
    if (!batch?.id) {
      await loadBatches();
      return null;
    }
    const next = await api.productBulk.get(id, batch.id);
    setBatch(next);
    setBatches((current) => current.map((candidate) => (candidate.id === next.id ? next : candidate)));
    if (options?.settleIfIdle && !isBatchRunning(next)) {
      setGenerationStatus((current) => (isJobRunning(current) ? null : current));
      setPollingRequested(false);
      setBusyAction(null);
    }
    return next;
  }, [batch?.id, id, loadBatches]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadBatches()
      .catch((err) => {
        if (mounted) setError(friendlyError(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadBatches]);

  useEffect(() => {
    const shouldPoll = pollingRequested || isJobRunning(generationStatus) || isBatchRunning(batch);
    if (!shouldPoll) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        await refreshBatch({ settleIfIdle: true });
      } catch (err) {
        setError(friendlyError(err));
        setPollingRequested(false);
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [batch, generationStatus, pollingRequested, refreshBatch]);

  useEffect(() => {
    if (!batch) return;
    if (!isBatchRunning(batch) && !isJobRunning(generationStatus)) {
      setPollingRequested(false);
      setBusyAction(null);
    }
  }, [batch, generationStatus]);

  const stats = useMemo(() => {
    const total = batch?.total_products || batch?.items.length || 0;
    const matched = batch?.items.filter((item) => Boolean(item.image_url)).length || 0;
    const missing = Math.max(0, total - matched);
    const generated = batch?.assets.filter((asset) => ["generated", "approved", "rejected"].includes(asset.status)).length || 0;
    const approved = batch?.assets.filter((asset) => asset.status === "approved").length || 0;
    const failed = batch?.failed_products || batch?.items.filter((item) => item.status === "failed").length || 0;
    return { total, matched, missing, generated, approved, failed };
  }, [batch]);

  const assetById = useMemo(() => {
    const map = new Map<string, ProductBulkAsset>();
    batch?.assets.forEach((asset) => map.set(asset.id, asset));
    return map;
  }, [batch]);

  const templateCards = useMemo(() => (batch?.template_directions || []).slice(0, 3), [batch]);
  const approvedTemplate = useMemo(
    () => batch?.template_directions.find((template) => template.status === "approved" || template.id === batch.approved_template_id) || null,
    [batch]
  );
  const canGenerateAll = Boolean(batch && approvedTemplate && !isBatchRunning(batch));

  async function runAction(action: BusyAction, task: () => Promise<void>, keepPolling = false) {
    setBusyAction(action);
    setError(null);
    try {
      await task();
      if (keepPolling) setPollingRequested(true);
    } catch (err) {
      setError(friendlyError(err));
      setBusyAction(null);
    }
  }

  async function uploadBatch() {
    if (!excelFile || !zipFile) {
      setError("Upload both an Excel file and image ZIP before importing.");
      return;
    }

    await runAction("upload", async () => {
      const created = await api.productBulk.create(id, {
        excel: excelFile,
        imagesZip: zipFile,
        creativePrompt,
        brandEnabled,
      });
      setBatch(created);
      setBatches((current) => [created, ...current.filter((candidate) => candidate.id !== created.id)]);
      setExcelFile(null);
      setZipFile(null);
      setGenerationStatus(null);
    });
  }

  async function generateFirst() {
    if (!batch) return;
    await runAction(
      "generate-first",
      async () => {
        const status = await api.productBulk.generateFirst(id, batch.id);
        setGenerationStatus(status);
        await refreshBatch();
      },
      true
    );
  }

  async function approveTemplate(templateId: string) {
    if (!batch) return;
    await runAction("approve-template", async () => {
      await api.productBulk.approveTemplate(id, batch.id, templateId);
      await refreshBatch();
    });
  }

  async function generateAll() {
    if (!batch) return;
    await runAction(
      "generate-all",
      async () => {
        const status = await api.productBulk.generateAll(id, batch.id);
        setGenerationStatus(status);
        await refreshBatch();
      },
      true
    );
  }

  async function approveAsset(assetId: string) {
    if (!batch) return;
    await runAction(`approve-${assetId}`, async () => {
      await api.productBulk.approveAsset(id, batch.id, assetId);
      await refreshBatch();
    });
  }

  async function rejectAsset(assetId: string) {
    if (!batch) return;
    await runAction(`reject-${assetId}`, async () => {
      await api.productBulk.rejectAsset(id, batch.id, assetId);
      await refreshBatch();
    });
  }

  async function regenerateAsset(assetId: string) {
    if (!batch) return;
    await runAction(
      `regenerate-${assetId}`,
      async () => {
        const status = await api.productBulk.regenerateAsset(id, batch.id, assetId, feedbackByAsset[assetId]);
        setGenerationStatus(status);
        await refreshBatch();
      },
      true
    );
  }

  const waitMessage =
    generationStatus?.status === "waiting_provider_limit"
      ? `Waiting for ${generationStatus.provider || "AI provider"} capacity${
          generationStatus.estimated_wait_seconds ? `, about ${Math.ceil(generationStatus.estimated_wait_seconds / 60)} min` : ""
        }.`
      : generationStatus?.message || (batch && isBatchRunning(batch) ? "Batch generation is running." : "");

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link href={`/suite/${id}`} className="mt-1 text-zinc-500 transition-colors hover:text-white" aria-label="Back to suite">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white">Product Bulk Studio</h1>
              {batch && <StatusBadge status={batch.status} />}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Import a catalog, choose the first product direction, then generate and review every product asset.
            </p>
          </div>
        </div>

        {batches.length > 1 && (
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Batch
            <select
              value={batch?.id || ""}
              onChange={(event) => {
                const selected = batches.find((candidate) => candidate.id === event.target.value) || null;
                setBatch(selected);
                setGenerationStatus(null);
                setError(null);
              }}
              className="h-9 max-w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-indigo-500"
            >
              {batches.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name || "Product bulk batch"} · {titleCaseStatus(candidate.status)}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-5 text-sm text-zinc-400">
          <Loader2 size={16} className="animate-spin" /> Loading product bulk batches...
        </div>
      ) : (
        <>
          <UploadPanel
            excelFile={excelFile}
            zipFile={zipFile}
            creativePrompt={creativePrompt}
            brandEnabled={brandEnabled}
            busy={busyAction === "upload"}
            onExcelChange={setExcelFile}
            onZipChange={setZipFile}
            onPromptChange={setCreativePrompt}
            onBrandEnabledChange={setBrandEnabled}
            onUpload={uploadBatch}
          />

          {batch ? (
            <>
              <BatchProgress batch={batch} stats={stats} generationStatus={generationStatus} waitMessage={waitMessage} />
              <ImportPreview batch={batch} stats={stats} />
              <TemplateSection
                batch={batch}
                templates={templateCards}
                assetById={assetById}
                busyAction={busyAction}
                approvedTemplate={approvedTemplate}
                onGenerateFirst={generateFirst}
                onApproveTemplate={approveTemplate}
                onGenerateAll={generateAll}
                canGenerateAll={canGenerateAll}
              />
              <AssetsGrid
                batch={batch}
                busyAction={busyAction}
                feedbackByAsset={feedbackByAsset}
                onFeedbackChange={(assetId, value) => setFeedbackByAsset((current) => ({ ...current, [assetId]: value }))}
                onApprove={approveAsset}
                onReject={rejectAsset}
                onRegenerate={regenerateAsset}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-12 text-center">
              <PackageOpen size={32} className="mx-auto mb-3 text-zinc-600" />
              <p className="text-sm text-zinc-400">No product bulk batch yet. Upload an Excel catalog and image ZIP to begin.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`capitalize ${statusBadgeClass(status)}`}>
      {titleCaseStatus(status)}
    </Badge>
  );
}

function UploadPanel({
  excelFile,
  zipFile,
  creativePrompt,
  brandEnabled,
  busy,
  onExcelChange,
  onZipChange,
  onPromptChange,
  onBrandEnabledChange,
  onUpload,
}: {
  excelFile: File | null;
  zipFile: File | null;
  creativePrompt: string;
  brandEnabled: boolean;
  busy: boolean;
  onExcelChange: (file: File | null) => void;
  onZipChange: (file: File | null) => void;
  onPromptChange: (value: string) => void;
  onBrandEnabledChange: (value: boolean) => void;
  onUpload: () => void;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900 text-white">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">1. Import source files</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">Use one Excel sheet for product data and one ZIP for product images.</p>
          </div>
          <Button onClick={onUpload} disabled={busy || !excelFile || !zipFile} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 sm:w-auto">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import batch
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_1.25fr]">
        <FileInput
          id="product-bulk-excel"
          label="Excel catalog"
          accept=".xlsx,.xls"
          file={excelFile}
          icon={<FileSpreadsheet size={18} />}
          onChange={onExcelChange}
        />
        <FileInput
          id="product-bulk-zip"
          label="Image ZIP"
          accept=".zip"
          file={zipFile}
          icon={<PackageOpen size={18} />}
          onChange={onZipChange}
        />
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Creative prompt</span>
            <textarea
              value={creativePrompt}
              onChange={(event) => onPromptChange(event.target.value)}
              rows={4}
              dir="auto"
              placeholder="Visual direction, campaign angle, aspect ratio, placement rules..."
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-indigo-500"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
            <span>Use brand profile</span>
            <input
              type="checkbox"
              checked={brandEnabled}
              onChange={(event) => onBrandEnabledChange(event.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function FileInput({
  id,
  label,
  accept,
  file,
  icon,
  onChange,
}: {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  icon: React.ReactNode;
  onChange: (file: File | null) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-h-36 cursor-pointer flex-col justify-between rounded-lg border border-dashed border-zinc-700 bg-zinc-950 p-4 transition-colors hover:border-zinc-500">
      <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
        <span className="text-indigo-300">{icon}</span>
        {label}
      </span>
      <span className="mt-5 min-w-0 text-xs text-zinc-500">
        {file ? (
          <span className="block truncate text-zinc-300">{file.name}</span>
        ) : (
          <span>Choose {accept.replaceAll(".", "").toUpperCase()}</span>
        )}
      </span>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        className="sr-only"
      />
    </label>
  );
}

function BatchProgress({
  batch,
  stats,
  generationStatus,
  waitMessage,
}: {
  batch: ProductBulkBatch;
  stats: { total: number; matched: number; missing: number; generated: number; approved: number; failed: number };
  generationStatus: GenerationStatus | null;
  waitMessage: string;
}) {
  const progress = generationStatus?.progress ?? (batch.total_products ? Math.round((batch.completed_products / batch.total_products) * 100) : 0);
  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Products" value={stats.total} />
        <Stat label="Matched images" value={stats.matched} tone="emerald" />
        <Stat label="Missing images" value={stats.missing} tone={stats.missing > 0 ? "amber" : "zinc"} />
        <Stat label="Generated assets" value={stats.generated} />
        <Stat label="Approved" value={stats.approved} tone="emerald" />
      </div>

      {(isBatchRunning(batch) || isJobRunning(generationStatus)) && (
        <div className="space-y-2 rounded-lg border border-indigo-900 bg-indigo-950/30 px-4 py-3 text-sm text-indigo-200">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            <span className="min-w-0 break-words">{waitMessage || "Batch is running."}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-indigo-950">
            <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${Math.max(5, Math.min(100, progress || 8))}%` }} />
          </div>
        </div>
      )}

      {generationStatus?.status === "failed" && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {generationStatus.error || generationStatus.message || "Generation failed."}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, tone = "zinc" }: { label: string; value: number; tone?: "zinc" | "emerald" | "amber" }) {
  const valueClass = tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-white";
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function ImportPreview({
  batch,
  stats,
}: {
  batch: ProductBulkBatch;
  stats: { total: number; matched: number; missing: number; generated: number; approved: number; failed: number };
}) {
  const rows = batch.items.slice(0, 8);
  return (
    <Card className="border-zinc-800 bg-zinc-900 text-white">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">2. Import preview</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">
              {stats.matched} images matched, {stats.missing} missing.
            </p>
          </div>
          <StatusBadge status={batch.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-zinc-950 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Image</th>
                <th className="px-3 py-2 font-medium">Slogan</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((item) => (
                <tr key={item.id} className="text-zinc-300">
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-500">{item.row_index}</td>
                  <td className="max-w-[240px] px-3 py-3">
                    <p className="truncate font-medium text-zinc-100" dir="auto">{item.product_name}</p>
                    {item.price && <p className="mt-1 truncate text-xs text-zinc-500">{item.price}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {item.image_url ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertTriangle size={14} className="text-amber-400" />}
                      <span className="max-w-[180px] truncate text-xs text-zinc-400">{item.image_ref || (item.image_url ? "Matched" : "Missing")}</span>
                    </div>
                  </td>
                  <td className="max-w-[220px] px-3 py-3 text-xs text-zinc-500">
                    <span className="line-clamp-2" dir="auto">{item.slogan || item.description || "-"}</span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-zinc-500">
                    Imported rows will appear here after upload.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateSection({
  batch,
  templates,
  assetById,
  busyAction,
  approvedTemplate,
  canGenerateAll,
  onGenerateFirst,
  onApproveTemplate,
  onGenerateAll,
}: {
  batch: ProductBulkBatch;
  templates: ProductTemplateDirection[];
  assetById: Map<string, ProductBulkAsset>;
  busyAction: BusyAction | null;
  approvedTemplate: ProductTemplateDirection | null;
  canGenerateAll: boolean;
  onGenerateFirst: () => void;
  onApproveTemplate: (templateId: string) => void;
  onGenerateAll: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">3. Template direction</h2>
          <p className="mt-1 text-xs text-zinc-500">Generate three first-product samples, approve one, then apply it to the full catalog.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={onGenerateFirst}
            disabled={Boolean(busyAction) || isBatchRunning(batch)}
            className="gap-2 bg-indigo-600 hover:bg-indigo-500"
          >
            {busyAction === "generate-first" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generate first templates
          </Button>
          <Button
            onClick={onGenerateAll}
            disabled={Boolean(busyAction) || !canGenerateAll}
            className="gap-2 bg-emerald-700 hover:bg-emerald-600"
          >
            {busyAction === "generate-all" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Generate all
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {templates.map((template, index) => {
          const sample = template.sample_asset_id ? assetById.get(template.sample_asset_id) : undefined;
          const fallbackSample = Array.from(assetById.values()).find((asset) => asset.template_direction_id === template.id);
          const sampleUrl = mediaUrl(sample?.media_url || fallbackSample?.media_url);
          const selected = approvedTemplate?.id === template.id;
          return (
            <Card key={template.id} className={`border-zinc-800 bg-zinc-900 text-white ${selected ? "ring-1 ring-emerald-500" : ""}`}>
              {sampleUrl ? (
                <img src={sampleUrl} alt={`${template.name} sample`} className="aspect-[4/5] w-full bg-zinc-950 object-contain" />
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center bg-zinc-950 text-zinc-700">
                  <ImageIcon size={32} />
                </div>
              )}
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-100">{template.name || `Template ${index + 1}`}</p>
                    <p className="mt-1 line-clamp-3 text-xs text-zinc-500" dir="auto">{template.description || "Generated direction candidate."}</p>
                  </div>
                  <StatusBadge status={selected ? "approved" : template.status} />
                </div>
                <Button
                  onClick={() => onApproveTemplate(template.id)}
                  disabled={Boolean(busyAction) || selected || isBatchRunning(batch)}
                  className="w-full gap-2 bg-emerald-700 hover:bg-emerald-600"
                >
                  {busyAction === "approve-template" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {selected ? "Approved" : "Approve template"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {templates.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-10 text-center md:col-span-3">
            <Sparkles size={28} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-400">Generate first templates to review three directions.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function AssetsGrid({
  batch,
  busyAction,
  feedbackByAsset,
  onFeedbackChange,
  onApprove,
  onReject,
  onRegenerate,
}: {
  batch: ProductBulkBatch;
  busyAction: BusyAction | null;
  feedbackByAsset: Record<string, string>;
  onFeedbackChange: (assetId: string, value: string) => void;
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onRegenerate: (assetId: string) => void;
}) {
  const itemById = useMemo(() => {
    const map = new Map<string, ProductBulkItem>();
    batch.items.forEach((item) => map.set(item.id, item));
    return map;
  }, [batch.items]);

  const assets = batch.assets;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white">4. Generated assets</h2>
        <p className="mt-1 text-xs text-zinc-500">Approve, reject, regenerate with feedback, download, or open the generated media.</p>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-10 text-center">
          <ImageIcon size={28} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-400">Generated assets will appear here after template generation starts.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => {
            const item = itemById.get(asset.item_id);
            const url = mediaUrl(asset.media_url);
            const actionBusy = busyAction === `approve-${asset.id}` || busyAction === `reject-${asset.id}` || busyAction === `regenerate-${asset.id}`;
            return (
              <Card key={asset.id} className="border-zinc-800 bg-zinc-900 text-white">
                {url ? (
                  <img src={url} alt={item?.product_name ? `${item.product_name} generated asset` : "Generated product asset"} className="aspect-[4/5] w-full bg-zinc-950 object-contain" />
                ) : (
                  <div className="flex aspect-[4/5] w-full items-center justify-center bg-zinc-950 text-zinc-700">
                    {asset.status === "generating" ? <Loader2 size={28} className="animate-spin" /> : <ImageIcon size={32} />}
                  </div>
                )}
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-100" dir="auto">{item?.product_name || "Product asset"}</p>
                      <p className="mt-1 truncate text-xs text-zinc-500">{item?.image_ref || asset.media_type}</p>
                    </div>
                    <StatusBadge status={asset.status} />
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-500">Regeneration feedback</span>
                    <textarea
                      value={feedbackByAsset[asset.id] || ""}
                      onChange={(event) => onFeedbackChange(asset.id, event.target.value)}
                      rows={2}
                      dir="auto"
                      placeholder="What should change?"
                      className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-indigo-500"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => onApprove(asset.id)} disabled={Boolean(busyAction) || asset.status === "approved"} className="gap-1 bg-emerald-700 text-xs hover:bg-emerald-600">
                      {busyAction === `approve-${asset.id}` ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onReject(asset.id)} disabled={Boolean(busyAction) || asset.status === "rejected"} className="gap-1 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800">
                      {busyAction === `reject-${asset.id}` ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onRegenerate(asset.id)} disabled={Boolean(busyAction)} className="gap-1 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800">
                      {busyAction === `regenerate-${asset.id}` ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Regenerate
                    </Button>
                    {url ? (
                      <a
                        href={url}
                        download
                        className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-zinc-700 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                      >
                        <Download size={12} />
                        Download
                      </a>
                    ) : (
                      <span className="inline-flex h-7 items-center justify-center rounded-lg border border-zinc-800 px-2.5 text-xs text-zinc-600">Download</span>
                    )}
                  </div>

                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                    >
                      <ExternalLink size={12} />
                      Open media
                    </a>
                  )}

                  {actionBusy && <p className="text-xs text-zinc-500">Updating asset...</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
