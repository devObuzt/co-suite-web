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
import { api, GenerationStatus, paymentGateDetail, PaymentGateDetail, ProductBulkAsset, ProductBulkBatch, ProductBulkItem, ProductTemplateDirection } from "@/lib/api";
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
  const [paymentGate, setPaymentGate] = useState<PaymentGateDetail | null>(null);
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

  const activeBatchId = batch?.id || "";
  const refreshBatch = useCallback(async (options?: { settleIfIdle?: boolean }) => {
    if (!activeBatchId) {
      await loadBatches();
      return null;
    }
    const [next, job] = await Promise.all([
      api.productBulk.get(id, activeBatchId),
      api.productBulk.generationStatus(id, activeBatchId),
    ]);
    setBatch(next);
    setGenerationStatus(job.status === "idle" ? null : job);
    setBatches((current) => current.map((candidate) => (candidate.id === next.id ? next : candidate)));
    if (options?.settleIfIdle && !isBatchRunning(next) && !isJobRunning(job)) {
      setPollingRequested(false);
      setBusyAction(null);
    }
    if (options?.settleIfIdle && job.is_terminal) {
      setBusyAction(null);
    }
    return next;
  }, [activeBatchId, id, loadBatches]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve()
      .then(loadBatches)
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
  const firstProduct = batch?.items.slice().sort((a, b) => a.row_index - b.row_index)[0] || null;
  const running = isBatchRunning(batch) || isJobRunning(generationStatus);
  const canGenerateFirst = Boolean(
    batch
    && batch.items.length > 0
    && !running
    && Boolean(firstProduct?.image_url)
    && templateCards.length === 0
  );
  const hasStaleApprovedTemplate = Boolean(batch?.approved_template_id && !approvedTemplate);
  const canGenerateAll = Boolean(batch && approvedTemplate && !running);
  const generateFirstBlocker = !batch
    ? "Import a batch first."
    : batch.items.length === 0
      ? "The batch has no products."
      : templateCards.length > 0
        ? "Template directions already exist for this batch."
        : !firstProduct?.image_url
          ? "The first product needs a matched image before template generation."
          : running
            ? "Generation is already running."
            : "";
  const generateAllBlocker = running
    ? "Generation is already running."
    : hasStaleApprovedTemplate
      ? "Approved template direction is no longer available."
      : !approvedTemplate
        ? "Approve one template direction before generating all products."
        : "";
  const generateAllWarning =
    approvedTemplate && stats.missing > 0
      ? `${stats.missing} product image${stats.missing === 1 ? " is" : "s are"} missing. Products without images will fail.`
      : "";

  async function runAction(action: BusyAction, task: () => Promise<void>, keepPolling = false) {
    setBusyAction(action);
    setError(null);
    setPaymentGate(null);
    try {
      await task();
      if (keepPolling) {
        setPollingRequested(true);
      } else {
        setBusyAction(null);
      }
    } catch (err) {
      const gate = paymentGateDetail(err);
      if (gate) setPaymentGate(gate);
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
    const feedback = (feedbackByAsset[assetId] || "").trim();
    if (!feedback) {
      setError("Add feedback before rejecting this asset, so the next generation can learn from it.");
      return;
    }
    await runAction(`reject-${assetId}`, async () => {
      await api.productBulk.rejectAsset(id, batch.id, assetId, feedback);
      setFeedbackByAsset((current) => ({ ...current, [assetId]: "" }));
      await refreshBatch();
    });
  }

  async function regenerateAsset(assetId: string) {
    if (!batch) return;
    const feedback = (feedbackByAsset[assetId] || "").trim();
    if (!feedback) {
      setError("Add feedback before regenerating this asset, so the next version has a clear direction.");
      return;
    }
    await runAction(
      `regenerate-${assetId}`,
      async () => {
        const status = await api.productBulk.regenerateAsset(id, batch.id, assetId, feedback);
        setGenerationStatus(status);
        setFeedbackByAsset((current) => ({ ...current, [assetId]: "" }));
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
          <Link href={`/suite/${id}`} className="mt-1 text-muted-foreground transition-colors hover:text-foreground" aria-label="Back to suite">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Product Bulk Studio</h1>
              {batch && <StatusBadge status={batch.status} />}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Import a catalog, choose the first product direction, then generate and review every product asset.
            </p>
          </div>
        </div>

        {batches.length > 1 && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Batch
            <select
              value={batch?.id || ""}
              onChange={(event) => {
                const selected = batches.find((candidate) => candidate.id === event.target.value) || null;
                setBatch(selected);
                setGenerationStatus(null);
                setError(null);
              }}
              className="h-9 max-w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
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
          <div className="min-w-0 space-y-2">
            <span className="block break-words">{error}</span>
            {paymentGate && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-red-100/80">
                  Required {paymentGate.required_tokens ?? 0} tokens, available {paymentGate.token_balance ?? 0}.
                </span>
                <Link href={`/suite/${id}/billing`}>
                  <Button size="sm" variant="outline" className="h-8 border-red-700 text-red-100 hover:bg-red-900/40">
                    Upgrade or buy tokens
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
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
                templates={templateCards}
                assetById={assetById}
                busyAction={busyAction}
                approvedTemplate={approvedTemplate}
                onGenerateFirst={generateFirst}
                onApproveTemplate={approveTemplate}
                onGenerateAll={generateAll}
                canGenerateFirst={canGenerateFirst}
                canGenerateAll={canGenerateAll}
                generateFirstBlocker={generateFirstBlocker}
                generateAllBlocker={generateAllBlocker}
                generateAllWarning={generateAllWarning}
                missingImages={stats.missing}
                running={running}
              />
              <AssetsGrid
                batch={batch}
                busyAction={busyAction}
                feedbackByAsset={feedbackByAsset}
                onFeedbackChange={(assetId, value) => setFeedbackByAsset((current) => ({ ...current, [assetId]: value }))}
                onApprove={approveAsset}
                onReject={rejectAsset}
                onRegenerate={regenerateAsset}
                running={running}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <PackageOpen size={32} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No product bulk batch yet. Upload an Excel catalog and image ZIP to begin.</p>
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
    <Card className="border-border bg-card text-card-foreground">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">1. Import source files</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Use one Excel sheet for product data and one ZIP for product images.</p>
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
            <span className="text-xs text-muted-foreground">Creative prompt</span>
            <textarea
              value={creativePrompt}
              onChange={(event) => onPromptChange(event.target.value)}
              rows={4}
              dir="auto"
              placeholder="Visual direction, campaign angle, aspect ratio, placement rules..."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
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
    <label htmlFor={id} className="flex min-h-36 cursor-pointer flex-col justify-between rounded-lg border border-dashed border-border bg-background p-4 transition-colors hover:border-ring">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-indigo-300">{icon}</span>
        {label}
      </span>
      <span className="mt-5 min-w-0 text-xs text-muted-foreground">
        {file ? (
          <span className="block truncate text-foreground">{file.name}</span>
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
  const valueClass = tone === "emerald" ? "text-emerald-500" : tone === "amber" ? "text-amber-500" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
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
  const firstProduct = batch.items.slice().sort((a, b) => a.row_index - b.row_index)[0] || null;
  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">2. Import preview</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.matched} images matched, {stats.missing} missing.
            </p>
          </div>
          <StatusBadge status={batch.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground">
            <span className="font-medium text-foreground">Matched:</span> {stats.matched} product image{stats.matched === 1 ? "" : "s"} ready for generation.
          </div>
          <div className={`rounded-lg border px-3 py-2 ${stats.missing > 0 ? "border-amber-900 bg-amber-950/30 text-amber-200" : "border-border bg-background text-muted-foreground"}`}>
            <span className="font-medium text-foreground">Missing:</span> {stats.missing} product image{stats.missing === 1 ? "" : "s"}. Missing-image products fail during full generation.
          </div>
        </div>
        {firstProduct && !firstProduct.image_url && (
          <div className="rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
            First product row {firstProduct.row_index} has no matched image. Generate first templates stays unavailable until that image is matched.
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Image</th>
                <th className="px-3 py-2 font-medium">Slogan</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((item) => (
                <tr key={item.id} className="text-foreground">
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{item.row_index}</td>
                  <td className="max-w-[240px] px-3 py-3">
                    <p className="truncate font-medium text-foreground" dir="auto">{item.product_name}</p>
                    {item.price && <p className="mt-1 truncate text-xs text-muted-foreground">{item.price}</p>}
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
  templates,
  assetById,
  busyAction,
  approvedTemplate,
  canGenerateFirst,
  canGenerateAll,
  generateFirstBlocker,
  generateAllBlocker,
  generateAllWarning,
  missingImages,
  running,
  onGenerateFirst,
  onApproveTemplate,
  onGenerateAll,
}: {
  templates: ProductTemplateDirection[];
  assetById: Map<string, ProductBulkAsset>;
  busyAction: BusyAction | null;
  approvedTemplate: ProductTemplateDirection | null;
  canGenerateFirst: boolean;
  canGenerateAll: boolean;
  generateFirstBlocker: string;
  generateAllBlocker: string;
  generateAllWarning: string;
  missingImages: number;
  running: boolean;
  onGenerateFirst: () => void;
  onApproveTemplate: (templateId: string) => void;
  onGenerateAll: () => void;
}) {
  const approveTemplateBlocker = running ? "Template approval is unavailable while this batch job is running." : "";
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
            disabled={Boolean(busyAction) || !canGenerateFirst}
            title={generateFirstBlocker || "Generate first templates"}
            className="gap-2 bg-indigo-600 hover:bg-indigo-500"
          >
            {busyAction === "generate-first" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generate first templates
          </Button>
          <Button
            onClick={onGenerateAll}
            disabled={Boolean(busyAction) || !canGenerateAll}
            title={generateAllBlocker || "Generate all products"}
            className="gap-2 bg-emerald-700 hover:bg-emerald-600"
          >
            {busyAction === "generate-all" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Generate all
          </Button>
        </div>
      </div>

      {(generateFirstBlocker || generateAllBlocker || generateAllWarning || missingImages > 0) && (
        <div className="rounded-lg border border-amber-900 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          {generateFirstBlocker && templates.length === 0 ? <p>{generateFirstBlocker}</p> : null}
          {generateAllBlocker ? <p>{generateAllBlocker}</p> : null}
          {generateAllWarning ? <p>{generateAllWarning}</p> : null}
        </div>
      )}

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
                  disabled={Boolean(busyAction) || selected || running}
                  title={selected ? "This template direction is approved." : approveTemplateBlocker || "Approve this template direction"}
                  className="w-full gap-2 bg-emerald-700 hover:bg-emerald-600"
                >
                  {busyAction === "approve-template" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {selected ? "Approved" : "Approve template"}
                </Button>
                {approveTemplateBlocker && !selected && (
                  <p className="text-xs text-amber-300">{approveTemplateBlocker}</p>
                )}
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
  running,
}: {
  batch: ProductBulkBatch;
  busyAction: BusyAction | null;
  feedbackByAsset: Record<string, string>;
  onFeedbackChange: (assetId: string, value: string) => void;
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onRegenerate: (assetId: string) => void;
  running: boolean;
}) {
  const itemById = useMemo(() => {
    const map = new Map<string, ProductBulkItem>();
    batch.items.forEach((item) => map.set(item.id, item));
    return map;
  }, [batch.items]);

  const assets = batch.assets;
  const regeneratedFromIds = useMemo(() => {
    const ids = new Set<string>();
    batch.assets.forEach((asset) => {
      const originalId = typeof asset.ai_metadata?.regenerated_from_asset_id === "string" ? asset.ai_metadata.regenerated_from_asset_id : null;
      if (originalId) ids.add(originalId);
    });
    return ids;
  }, [batch.assets]);
  const runningActionReason = running ? "Asset actions are unavailable while this batch job is running." : "";

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
            const feedback = (feedbackByAsset[asset.id] || "").trim();
            const actionBusy = busyAction === `approve-${asset.id}` || busyAction === `reject-${asset.id}` || busyAction === `regenerate-${asset.id}`;
            const actionDisabled = Boolean(busyAction) || running || asset.status === "generating";
            const originalAssetId = typeof asset.ai_metadata?.regenerated_from_asset_id === "string" ? asset.ai_metadata.regenerated_from_asset_id : null;
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

                  {asset.feedback && (
                    <p className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400" dir="auto">
                      Previous feedback: {asset.feedback}
                    </p>
                  )}
                  {originalAssetId && (
                    <p className="rounded-lg border border-indigo-900 bg-indigo-950/30 px-3 py-2 text-xs text-indigo-200">
                      Regenerated from asset {originalAssetId.slice(0, 8)}. The original asset remains in this review grid.
                    </p>
                  )}
                  {regeneratedFromIds.has(asset.id) && (
                    <p className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                      Original kept after regeneration.
                    </p>
                  )}

                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-500">Feedback for reject/regenerate</span>
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
                    <Button
                      size="sm"
                      onClick={() => onApprove(asset.id)}
                      disabled={actionDisabled || asset.status === "approved"}
                      title={runningActionReason || (asset.status === "generating" ? "Wait for this asset to finish generating." : "Approve this asset")}
                      className="gap-1 bg-emerald-700 text-xs hover:bg-emerald-600"
                    >
                      {busyAction === `approve-${asset.id}` ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReject(asset.id)}
                      disabled={actionDisabled || asset.status === "rejected"}
                      title={runningActionReason || (feedback ? "Reject this asset with feedback" : "Add feedback before rejecting this asset.")}
                      className="gap-1 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      {busyAction === `reject-${asset.id}` ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRegenerate(asset.id)}
                      disabled={actionDisabled || !feedback}
                      title={runningActionReason || (feedback ? "Regenerate this asset and keep the original visible." : "Add feedback before regenerating this asset.")}
                      className="gap-1 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                    >
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
                  {!feedback && asset.status !== "generating" && (
                    <p className="text-xs text-zinc-500">Reject and Regenerate require feedback.</p>
                  )}
                  {runningActionReason && <p className="text-xs text-amber-300">{runningActionReason}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
