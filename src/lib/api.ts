export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export type PaymentGateDetail = {
  code?: string;
  message?: string;
  required_tokens?: number;
  token_balance?: number;
  free_trial_remaining?: number;
  allowed_actions?: string[];
};

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function paymentGateDetail(err: unknown): PaymentGateDetail | null {
  if (!(err instanceof ApiError) || err.status !== 402) return null;
  if (!err.detail || typeof err.detail !== "object") return null;
  const detail = err.detail as PaymentGateDetail;
  return detail.code === "generation_tokens_exhausted" ? detail : null;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cosuite_token");
}

function buildHeaders(options: RequestInit, token: string | null): HeadersInit {
  const bodyIsFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers);

  if (bodyIsFormData) {
    headers.delete("Content-Type");
  } else if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

function clearInvalidSession(path: string, token: string | null): void {
  if (typeof window === "undefined" || !token) return;
  if (path === "/auth/login" || path === "/auth/signup") return;
  if (path.startsWith("/marketing-plans/share/")) return;

  localStorage.removeItem("cosuite_token");
  localStorage.removeItem("cosuite-auth");
  const next = `${window.location.pathname}${window.location.search}`;
  if (!window.location.pathname.startsWith("/login")) {
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  }
}

function isInvalidSession(status: number, detail: unknown): boolean {
  if (status !== 401) return false;
  const text =
    typeof detail === "string"
      ? detail
      : detail && typeof detail === "object" && "message" in detail
        ? String((detail as { message?: unknown }).message || "")
        : JSON.stringify(detail || "");
  return /invalid token|user not found|not authenticated|could not validate/i.test(text);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options, token),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    const detail = err.detail || err.message || "Request failed";
    if (isInvalidSession(res.status, detail)) {
      clearInvalidSession(path, token);
    }
    const message =
      typeof detail === "string"
        ? detail
        : typeof detail === "object" && detail && "message" in detail
          ? String((detail as { message?: unknown }).message || JSON.stringify(detail))
          : JSON.stringify(detail);
    throw new ApiError(isInvalidSession(res.status, detail) ? "انتهت الجلسة. سجّل الدخول من جديد." : message, res.status, detail);
  }

  return res.json();
}

async function downloadFile(path: string, options: RequestInit = {}): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders({ ...options, headers: { ...(options.headers || {}), Accept: "application/pdf" } }, token),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    const detail = err.detail || err.message || "Request failed";
    if (isInvalidSession(res.status, detail)) {
      clearInvalidSession(path, token);
    }
    const message = typeof detail === "string" ? detail : JSON.stringify(detail);
    throw new ApiError(isInvalidSession(res.status, detail) ? "انتهت الجلسة. سجّل الدخول من جديد." : message, res.status, detail);
  }

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return {
    blob: await res.blob(),
    filename: match?.[1] || "marketing-plan.pdf",
  };
}

export const api = {
  auth: {
    signup: (data: { email: string; password: string; full_name: string }) =>
      request<{ access_token: string; user: { id: string; email: string; full_name: string } }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ access_token: string; user: { id: string; email: string; full_name: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => request<{ id: string; email: string; full_name: string; is_active?: boolean; is_verified?: boolean; is_super_admin?: boolean }>("/auth/me"),
  },

  suites: {
    list: () => request<Suite[]>("/suites/"),
    create: (data: { name: string; website_url?: string }) =>
      request<Suite>("/suites/", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<Suite>(`/suites/${id}`),
    remove: (suiteId: string) =>
      request<{ ok: boolean; deleted_suite_id: string }>(`/suites/${suiteId}`, { method: "DELETE" }),
    updateBrand: (suiteId: string, brand: Brand) =>
      request<{ ok: boolean }>(`/suites/${suiteId}/brand`, { method: "PATCH", body: JSON.stringify(brand) }),
    marketResearch: (suiteId: string) =>
      request<{ results: MarketResult[] }>(`/suites/${suiteId}/market-research`),
    metaAds: (suiteId: string) =>
      request<{ ads: MetaAd[]; library_url: string; query?: string; countries?: string[]; warning?: string }>(
        `/suites/${suiteId}/meta-ads`
      ),
    storageStatus: (suiteId: string) =>
      request<StorageStatus>(`/suites/${suiteId}/storage-status`),
    storageTest: (suiteId: string) =>
      request<StorageTestResult>(`/suites/${suiteId}/storage-test`, { method: "POST", body: "{}" }),
    loops: (suiteId: string) =>
      request<{ loops: SocialLoop[]; suggestions: SocialLoopSuggestions; generated_plan: SocialLoop }>(
        `/suites/${suiteId}/loops`
      ),
    saveLoop: (suiteId: string, data: SocialLoop) =>
      request<{ ok: boolean; loop: SocialLoop; loops: SocialLoop[] }>(`/suites/${suiteId}/loops`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    contentRules: (suiteId: string) =>
      request<{ rules: ContentRule[] }>(`/suites/${suiteId}/content-rules`),
    addContentRules: (suiteId: string, rules: ContentRuleInput[], source = "manual") =>
      request<{ ok: boolean; rules: ContentRule[] }>(`/suites/${suiteId}/content-rules`, {
        method: "POST",
        body: JSON.stringify({ rules, source }),
      }),
    deleteContentRule: (suiteId: string, ruleId: string) =>
      request<{ ok: boolean; rules: ContentRule[] }>(`/suites/${suiteId}/content-rules/${ruleId}`, {
        method: "DELETE",
      }),
    teachContentRules: (suiteId: string, data: { feedback?: string; original?: string; edited?: string }) =>
      request<{ suggestions: ContentRule[] }>(`/suites/${suiteId}/content-rules/teach`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  onboarding: {
    extractBrand: (data: {
      suite_id: string;
      urls?: string[];
      business_name?: string;
      industry?: string;
      description?: string;
      user_language?: string;
      ai_provider?: "anthropic" | "openai";
    }) => request<{ brand: Brand; research_debug?: ResearchDebug }>("/onboarding/extract-brand", { method: "POST", body: JSON.stringify(data) }),
    saveBrand: (data: { suite_id: string; brand: Brand }) =>
      request<{ ok: boolean }>("/onboarding/save-brand", { method: "POST", body: JSON.stringify(data) }),
    generateStrategy: (data: { suite_id: string; user_language?: string }) =>
      request<{ strategy: MarketingStrategy }>("/onboarding/generate-strategy", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    saveBrandStep: (data: { suite_id: string; step: string; data: Partial<Brand> }) =>
      request<{ ok: boolean }>("/onboarding/save-brand-step", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    translateBrandFields: (data: {
      unique_value?: string;
      esp?: string;
      how_they_help?: string;
      target_language: string;
    }) =>
      request<{ unique_value: string; esp: string; how_they_help: string }>(
        "/onboarding/translate-brand-fields",
        { method: "POST", body: JSON.stringify(data) }
      ),
    generateBrandAssets: (data: { suite_id: string; generate: string[]; logo_style?: string; user_language?: string }) =>
      request<{ brand: Brand; generated: Record<string, unknown> }>(
        "/onboarding/generate-brand-assets",
        { method: "POST", body: JSON.stringify(data) }
      ),
    uploadBrandAsset: (suiteId: string, assetType: "logo" | "font", file: File, language?: string) => {
      const form = new FormData();
      form.append("suite_id", suiteId);
      form.append("asset_type", assetType);
      form.append("file", file);
      if (language) form.append("language", language);
      return request<{ url: string; brand: Brand }>("/onboarding/upload-brand-asset", {
        method: "POST",
        body: form,
        headers: {},  // let browser set multipart boundary
      });
    },
    uploadPersonaAsset: (suiteId: string, file: File, personaName: string) => {
      const form = new FormData();
      form.append("suite_id", suiteId);
      form.append("asset_type", "persona");
      form.append("persona_name", personaName);
      form.append("file", file);
      return request<{ url: string; brand: Brand }>("/onboarding/upload-brand-asset", {
        method: "POST",
        body: form,
        headers: {},
      });
    },
  },

  content: {
    generateAccount: (data: GenerateContentRequest = {}) =>
      request<GenerationStatus>("/content/account/generate", { method: "POST", body: JSON.stringify(data) }),
    accountGenerationStatus: () =>
      request<GenerationStatus>("/content/account/generation-status"),
    listAccount: () =>
      request<Post[]>("/content/account"),
    generate: (suiteId: string, data: GenerateContentRequest = {}) =>
      request<GenerationStatus>(`/content/${suiteId}/generate`, { method: "POST", body: JSON.stringify(data) }),
    uploadQuickAsset: (suiteId: string, kind: "logo" | "product" | "style" | "character" | "icon", file: File) => {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      return request<QuickAssetUploadResult>(`/content/${suiteId}/quick-assets`, {
        method: "POST",
        body: form,
        headers: {},
      });
    },
    uploadAccountQuickAsset: (kind: "logo" | "product" | "style" | "character" | "icon", file: File) => {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      return request<QuickAssetUploadResult>("/content/account/quick-assets", {
        method: "POST",
        body: form,
        headers: {},
      });
    },
    generationStatus: (suiteId: string) =>
      request<GenerationStatus>(`/content/${suiteId}/generation-status`),
    list: (suiteId: string, status?: string) =>
      request<Post[]>(`/content/${suiteId}${status ? `?status=${status}` : ""}`),
    update: (suiteId: string, postId: string, data: { caption?: string; hashtags?: string[]; topic?: string }) =>
      request<Post>(`/content/${suiteId}/${postId}`, { method: "PATCH", body: JSON.stringify(data) }),
    approve: (suiteId: string, postId: string) =>
      request<{ ok: boolean }>(`/content/${suiteId}/${postId}/approve`, { method: "POST", body: "{}" }),
    reject: (suiteId: string, postId: string, reason?: string) =>
      request<{ ok: boolean }>(`/content/${suiteId}/${postId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason, feedback: reason }),
      }),
    regenerate: (suiteId: string, postId: string, feedback?: string) =>
      request<GenerationStatus>(`/content/${suiteId}/${postId}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ feedback }),
      }),
    schedule: (suiteId: string, postId: string, publish_at: string) =>
      request<{ ok: boolean; status: string; publish_at: string }>(`/content/${suiteId}/${postId}/schedule`, {
        method: "POST",
        body: JSON.stringify({ publish_at }),
      }),
    markUsed: (suiteId: string, postId: string) =>
      request<{ ok: boolean; status: string; used_externally: boolean }>(
        `/content/${suiteId}/${postId}/mark-used`,
        { method: "POST", body: "{}" }
      ),
    publish: (suiteId: string, postId: string, platforms: string[] = ["facebook", "instagram"]) =>
      request<{ ok: boolean; results: Record<string, string>; status: string }>(
        `/content/${suiteId}/${postId}/publish`,
        { method: "POST", body: JSON.stringify({ platforms }) }
      ),
  },

  productBulk: {
    list: (suiteId: string) =>
      request<{ batches: ProductBulkBatch[] }>(`/suites/${suiteId}/product-bulk`),
    get: (suiteId: string, batchId: string) =>
      request<ProductBulkBatch>(`/suites/${suiteId}/product-bulk/${batchId}`),
    generationStatus: (suiteId: string, batchId: string) =>
      request<GenerationStatus>(`/suites/${suiteId}/product-bulk/${batchId}/generation-status`),
    create: (
      suiteId: string,
      data: { excel: File; imagesZip: File; creativePrompt?: string; brandEnabled?: boolean }
    ) => {
      const form = new FormData();
      form.append("excel", data.excel);
      form.append("images_zip", data.imagesZip);
      form.append("creative_prompt", data.creativePrompt || "");
      form.append("brand_enabled", String(data.brandEnabled ?? true));
      return request<ProductBulkBatch>(`/suites/${suiteId}/product-bulk`, {
        method: "POST",
        body: form,
      });
    },
    generateFirst: (suiteId: string, batchId: string) =>
      request<GenerationStatus>(`/suites/${suiteId}/product-bulk/${batchId}/generate-first`, {
        method: "POST",
        body: "{}",
      }),
    approveTemplate: (suiteId: string, batchId: string, templateId: string) =>
      request<{ ok: boolean; template_id: string; status: string }>(
        `/suites/${suiteId}/product-bulk/${batchId}/templates/${templateId}/approve`,
        { method: "POST", body: "{}" }
      ),
    generateAll: (suiteId: string, batchId: string) =>
      request<GenerationStatus>(`/suites/${suiteId}/product-bulk/${batchId}/generate-all`, {
        method: "POST",
        body: "{}",
      }),
    approveAsset: (suiteId: string, batchId: string, assetId: string) =>
      request<{ ok: boolean; asset_id: string; status: string }>(
        `/suites/${suiteId}/product-bulk/${batchId}/assets/${assetId}/approve`,
        { method: "POST", body: "{}" }
      ),
    rejectAsset: (suiteId: string, batchId: string, assetId: string, feedback?: string) =>
      request<{ ok: boolean; asset_id: string; status: string; feedback?: string }>(
        `/suites/${suiteId}/product-bulk/${batchId}/assets/${assetId}/reject`,
        { method: "POST", body: JSON.stringify({ feedback }) }
      ),
    regenerateAsset: (suiteId: string, batchId: string, assetId: string, feedback?: string) =>
      request<GenerationStatus>(`/suites/${suiteId}/product-bulk/${batchId}/assets/${assetId}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ feedback }),
      }),
  },

  videoMontage: {
    latest: (suiteId: string) =>
      request<GenerationStatus>(`/suites/${suiteId}/video-montage/jobs/latest`),
    list: (suiteId: string, limit = 10) =>
      request<{ jobs: GenerationStatus[] }>(`/suites/${suiteId}/video-montage/jobs?limit=${limit}`),
    stageSource: (suiteId: string, sourceUrl: string) =>
      request<{ staged_url: string }>(`/suites/${suiteId}/video-montage/stage-source`, {
        method: "POST",
        body: JSON.stringify({ source_url: sourceUrl }),
      }),
    get: (suiteId: string, jobId: string) =>
      request<GenerationStatus>(`/suites/${suiteId}/video-montage/jobs/${jobId}`),
    create: (
      suiteId: string,
      data: {
        mode: string;
        sourceUrl?: string;
        options: string[];
        notes?: string;
        sourceFile?: File | null;
        captionOverrides?: string[];
        titleOverrides?: string[];
        zoom?: number;
        offsetX?: number;
        offsetY?: number;
        backgroundsMode?: "blend" | "user_only";
      }
    ) => {
      const form = new FormData();
      form.append("mode", data.mode);
      form.append("source_url", data.sourceUrl || "");
      form.append("options_json", JSON.stringify(data.options || []));
      form.append("backgrounds_mode", data.backgroundsMode || "blend");
      form.append("zoom", String(data.zoom ?? 1));
      form.append("subject_offset_x", String(data.offsetX ?? 0));
      form.append("subject_offset_y", String(data.offsetY ?? 0));
      form.append("caption_overrides_json", JSON.stringify(data.captionOverrides || []));
      form.append("title_overrides_json", JSON.stringify(data.titleOverrides || []));
      form.append("notes", data.notes || "");
      if (data.sourceFile) form.append("source_file", data.sourceFile);
      return request<GenerationStatus>(`/suites/${suiteId}/video-montage/jobs`, {
        method: "POST",
        body: form,
      });
    },
  },

  media: {
    tree: (suiteId: string) =>
      request<MediaTreeResponse>(`/suites/${suiteId}/media/tree`),
    list: (suiteId: string, params: { library?: string; year?: number; month?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.library) query.set("library", params.library);
      if (params.year != null) query.set("year", String(params.year));
      if (params.month != null) query.set("month", String(params.month));
      const suffix = query.toString() ? `?${query.toString()}` : "";
      return request<MediaAssetItem[]>(`/suites/${suiteId}/media${suffix}`);
    },
    listBackgrounds: (suiteId: string) =>
      request<{ assets: BackgroundAssetItem[] }>(`/suites/${suiteId}/media/backgrounds`),
    uploadBackgrounds: (suiteId: string, files: File[]) => {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      return request<{ assets: BackgroundAssetItem[]; warnings: string[] }>(
        `/suites/${suiteId}/media/backgrounds`,
        { method: "POST", body: form }
      );
    },
    deleteBackground: (suiteId: string, assetId: string) =>
      request<{ ok: boolean; asset_id: string }>(`/suites/${suiteId}/media/backgrounds/${assetId}`, {
        method: "DELETE",
      }),
  },

  marketingPlans: {
    get: (suiteId: string) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan`),
    status: (suiteId: string) =>
      request<GenerationStatus>(`/suites/${suiteId}/marketing-plan/generation-status`),
    generate: (suiteId: string, data?: { language?: string; near_term_focus?: string; upcoming_campaigns?: string[]; planning_notes?: string }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/generate`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    delete: (suiteId: string) =>
      request<MarketingPlanResponse & { deleted?: boolean; removed?: string[] }>(`/suites/${suiteId}/marketing-plan`, {
        method: "DELETE",
      }),
    generateCompetitors: (suiteId: string, data?: { language?: string; near_term_focus?: string; upcoming_campaigns?: string[]; planning_notes?: string }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/competitors/generate`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    generateMoreCompetitors: (suiteId: string, data?: { language?: string; existing_ids?: string[]; existing_values?: string[] }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/competitors/generate-more`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    updateCompetitor: (suiteId: string, competitorId: string, data: { classification_tags: string[] }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/competitors/${competitorId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    updateCompetitors: (suiteId: string, data: { competitors: MarketingCompetitor[] }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/competitors`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    generateKeywords: (suiteId: string, data?: { language?: string; existing_ids?: string[]; existing_values?: string[] }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/keywords/generate`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    generateMoreKeywords: (suiteId: string, data?: { language?: string; existing_ids?: string[]; existing_values?: string[] }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/keywords/generate-more`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    updateKeywords: (suiteId: string, data: { keywords: MarketingKeyword[] }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/keywords`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    generateDemandSupply: (suiteId: string, data?: { language?: string; near_term_focus?: string; upcoming_campaigns?: string[]; planning_notes?: string }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/demand-supply/generate`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    generateMoreDemandSupply: (suiteId: string, data?: { language?: string }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/demand-supply/generate-more`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    generatePersonas: (suiteId: string, data?: { language?: string; existing_ids?: string[]; existing_values?: string[]; count?: number }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/personas/generate`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    generateMorePersonas: (suiteId: string, data?: { language?: string; existing_ids?: string[]; existing_values?: string[]; count?: number }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/personas/generate`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    generateSocialPlan: (suiteId: string, data?: { language?: string; near_term_focus?: string; upcoming_campaigns?: string[]; planning_notes?: string }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/social-plan/generate`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    generateSocialContentPlan: (suiteId: string, data?: { language?: string; monthly_posts?: number; plan_type?: "weekly" | "monthly" }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/social-content-plan/generate`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    updateSocialContentPlanSelection: (suiteId: string, selectedIds: string[]) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/social-content-plan/selection`, {
        method: "POST",
        body: JSON.stringify({ selected_ids: selectedIds }),
      }),
    updateSocialContentItem: (suiteId: string, itemId: string, data: { title?: string; idea?: string; script?: string; cta?: string }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/social-content-plan/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    generateSocialContentItem: (suiteId: string, itemId: string) =>
      request<GenerationStatus>(`/suites/${suiteId}/marketing-plan/social-content-plan/items/${itemId}/generate`, {
        method: "POST",
        body: "{}",
      }),
    generateSocialContentItems: (suiteId: string, itemIds?: string[]) =>
      request<MarketingPlanResponse & { queued_job_ids: string[]; skipped: Array<{ item_id: string; reason: string }>; payment_required: boolean }>(
        `/suites/${suiteId}/marketing-plan/social-content-plan/generate-items`,
        {
          method: "POST",
          body: JSON.stringify({ item_ids: itemIds || [] }),
        }
      ),
    generatePaidContentPlan: (suiteId: string, data?: { language?: string }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/paid-content-plan/generate`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    updatePaidContentPlanSelection: (suiteId: string, selectedIds: string[]) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/paid-content-plan/selection`, {
        method: "POST",
        body: JSON.stringify({ selected_ids: selectedIds }),
      }),
    generatePaidFunnel: (suiteId: string, data?: { language?: string; near_term_focus?: string; upcoming_campaigns?: string[]; planning_notes?: string }) =>
      request<MarketingPlanResponse>(`/suites/${suiteId}/marketing-plan/paid-funnel/generate`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    share: (suiteId: string, data: { enabled?: boolean; password?: string }) =>
      request<{ ok: boolean; share: MarketingPlanShare }>(`/suites/${suiteId}/marketing-plan/share`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    publicGet: (token: string) =>
      request<PublicMarketingPlanResponse>(`/marketing-plans/share/${token}`),
    unlock: (token: string, password: string) =>
      request<PublicMarketingPlanResponse>(`/marketing-plans/share/${token}/unlock`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    generateVisuals: (suiteId: string) =>
      request<{ visuals: PlanVisual[] }>(`/suites/${suiteId}/marketing-plan/visuals/generate`, {
        method: "POST",
        body: "{}",
      }),
    downloadPdf: (suiteId: string) =>
      downloadFile(`/suites/${suiteId}/marketing-plan/pdf`),
  },

  analytics: {
    get: (suiteId: string, days = 28) =>
      request<AnalyticsData>(`/analytics/${suiteId}?days=${days}`),
  },

  billing: {
    get: (suiteId: string) => request<Subscription>(`/billing/${suiteId}`),
    usage: (suiteId: string) => request<UsageEvent[]>(`/billing/${suiteId}/usage`),
    updateSeats: (suiteId: string, seat_count: number) =>
      request<Subscription>(`/billing/${suiteId}/seats`, { method: "PATCH", body: JSON.stringify({ seat_count }) }),
    toggleAutoPay: (suiteId: string, enabled: boolean) =>
      request<{ ok: boolean }>(`/billing/${suiteId}/auto-pay`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    subscribeUrl: (suiteId: string) => request<{ url: string }>(`/billing/${suiteId}/subscribe-url`),
    payUrl: (suiteId: string) => request<{ url: string; amount: number }>(`/billing/${suiteId}/pay-url`),
  },

  admin: {
    summary: (period = "month") => request<AdminSummary>(`/admin/summary?period=${period}`),
    providers: () => request<AdminProvider[]>("/admin/providers"),
    users: (q = "") => request<AdminUser[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    user: (userId: string) => request<AdminUserDetail>(`/admin/users/${userId}`),
    updateUser: (userId: string, data: Partial<Pick<AdminUser, "email" | "full_name" | "is_active" | "is_verified" | "is_super_admin">>) =>
      request<AdminUser>(`/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) }),
    changePassword: (userId: string, password: string) =>
      request<{ ok: boolean }>(`/admin/users/${userId}/password`, { method: "POST", body: JSON.stringify({ password }) }),
    deactivateUser: (userId: string) =>
      request<{ ok: boolean; deactivated: boolean }>(`/admin/users/${userId}`, { method: "DELETE" }),
    billingUsage: (period = "month") => request<AdminBillingUsageEvent[]>(`/admin/billing-usage?period=${period}`),
    auditLogs: (period = "month") => request<AuditLog[]>(`/admin/audit-logs?period=${period}`),
    providerUsage: (period = "month") => request<ProviderUsageEvent[]>(`/admin/provider-usage?period=${period}`),
    providerUsageSummary: (period = "month") => request<ProviderUsageSummary[]>(`/admin/provider-usage/summary?period=${period}`),
    creativeAssets: (kind = "") =>
      request<CreativeAsset[]>(`/admin/creative-assets${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`),
    seedCreativeBuiltins: () =>
      request<{ ok: boolean; seeded: number }>("/admin/creative-assets/seed-builtins", { method: "POST", body: "{}" }),
    uploadCreativeAsset: (data: { kind: string; title?: string; file: File }) => {
      const form = new FormData();
      form.append("kind", data.kind);
      form.append("title", data.title || data.file.name);
      form.append("file", data.file);
      return request<CreativeAsset>("/admin/creative-assets/upload", { method: "POST", body: form });
    },
    updateCreativeAsset: (assetId: string, data: Partial<Pick<CreativeAsset, "title" | "tags" | "use_cases" | "classification" | "active">>) =>
      request<CreativeAsset>(`/admin/creative-assets/${assetId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deactivateCreativeAsset: (assetId: string) =>
      request<{ ok: boolean; deactivated: boolean }>(`/admin/creative-assets/${assetId}`, { method: "DELETE" }),
    appText: (language = "ar") => request<AdminAppTextResponse>(`/admin/app-text?language=${encodeURIComponent(language)}`),
    updateAppText: (data: { language: string; key: string; value: string | null }) =>
      request<AdminAppTextUpdateResponse>("/admin/app-text", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  appText: {
    get: (language: string) => request<AppTextPublicResponse>(`/app-text/${encodeURIComponent(language)}`),
  },

  connections: {
    get: (suiteId: string) => request<Connections>(`/connections/${suiteId}`),
    metaAuthUrl: (suiteId: string) => request<{ url: string }>(`/connections/${suiteId}/meta/auth-url`),
    googleAuthUrl: (suiteId: string) => request<{ url: string }>(`/connections/${suiteId}/google/auth-url`),
    metaCallback: (suiteId: string, code: string) =>
      request<{ pages: MetaPage[]; ad_accounts: MetaAdAccount[] }>("/connections/meta/callback", {
        method: "POST",
        body: JSON.stringify({ suite_id: suiteId, code }),
      }),
    googleCallback: (suiteId: string, code: string) =>
      request<{ customers: GoogleAdsCustomer[] }>("/connections/google/callback", {
        method: "POST",
        body: JSON.stringify({ suite_id: suiteId, code }),
      }),
    metaSelectPage: (data: {
      suite_id: string; page_id: string; page_name: string;
      page_access_token: string; ig_user_id?: string; ig_username?: string;
      ad_account_id?: string; ad_account_name?: string; ad_account_currency?: string;
    }) => request<{ ok: boolean }>("/connections/meta/select-page", { method: "POST", body: JSON.stringify(data) }),
    googleSelectCustomer: (data: { suite_id: string; customer_id: string; customer_name?: string }) =>
      request<{ ok: boolean }>("/connections/google/select-customer", { method: "POST", body: JSON.stringify(data) }),
    disconnect: (suiteId: string, platform: string) =>
      request<{ ok: boolean }>(`/connections/${suiteId}/${platform}`, { method: "DELETE" }),
    campaigns: (suiteId: string) =>
      request<{ campaigns: MetaCampaign[]; warning?: string }>(`/connections/${suiteId}/meta/campaigns`),
    googleCampaigns: (suiteId: string) =>
      request<{ campaigns: GoogleAdsCampaign[]; warning?: string }>(`/connections/${suiteId}/google/campaigns`),
  },
};


export interface MediaTreeMonth {
  month: string;
  count: number;
}

export interface MediaTreeYear {
  year: number;
  months: MediaTreeMonth[];
}

export interface MediaTreeLibrary {
  key: string;
  label: string;
  years: MediaTreeYear[];
}

export interface MediaTreeResponse {
  libraries: MediaTreeLibrary[];
}

export interface MediaAssetItem {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  content_type: string;
  duration_seconds: number | null;
  created_at: string | null;
}

export interface BackgroundAssetItem {
  id: string;
  kind: string;
  title: string;
  storage_url: string;
  content_type?: string | null;
  duration_seconds?: number | null;
  tags: string[];
  metadata?: Record<string, unknown>;
  created_at?: string | null;
}

export interface MarketingPlanMetric {
  label: string;
  value: string;
}

export interface MarketingPlanCard {
  title: string;
  body?: string;
  points?: string[];
}

export interface MarketingPlanDeckSection {
  id: string;
  title: string;
  summary?: string;
  bullets: string[];
  cards?: MarketingPlanCard[];
  metrics?: MarketingPlanMetric[];
}

export interface MarketingPlanShare {
  enabled: boolean;
  token?: string;
  password_required?: boolean;
}

export interface MarketingPlanDeck {
  version: string;
  status: "ready" | "missing" | string;
  language: string;
  generated_at?: string;
  planning_inputs?: {
    near_term_focus?: string;
    upcoming_campaigns?: string[];
    planning_notes?: string;
    [key: string]: unknown;
  };
  partial?: {
    intelligence_ready?: boolean;
    deck_ready?: boolean;
    action_plan_ready?: boolean;
    social_plan_ready?: boolean;
    paid_funnel_ready?: boolean;
    [key: string]: unknown;
  };
  cover: {
    title: string;
    subtitle?: string;
    chips?: string[];
    image_url?: string;
    image_prompt?: string;
  };
  research_summary?: {
    sources_used?: string[];
    confidence?: string;
    limitations?: string[];
    [key: string]: unknown;
  };
  monthly_work_plan?: {
    client_focus_questions?: string[];
    calendar_context?: {
      countries?: string[];
      religions_considered?: string[];
      seasonal_notes?: string[];
      [key: string]: unknown;
    };
    recommended_weekly_posts?: number;
    recommended_monthly_posts?: number;
    cadence_reason?: string;
    content_mix?: Array<{ type: string; percentage: number }>;
    daily_story_direction?: string[];
    items?: MarketingPlanWorkItem[];
  };
  paid_funnel?: {
    stages?: MarketingPlanFunnelStage[];
  };
  sections: MarketingPlanDeckSection[];
  share?: MarketingPlanShare;
}

export interface MarketingSourceLink {
  label: string;
  url?: string;
  source?: string;
}

export interface MarketingCompetitor {
  id: string;
  name: string;
  title?: string;
  platform: string;
  result_type?: string;
  url?: string;
  reason?: string;
  offer?: string;
  evidence?: string;
  snippet?: string;
  opportunity?: string;
  confidence?: string;
  research_lead?: boolean;
  classification_tags?: string[];
  relevance?: string;
  rating?: number;
  reviews?: number;
  address?: string;
}

export interface MarketingKeyword {
  id: string;
  text: string;
  intent?: string;
  source?: string;
  confidence?: string;
}

export interface MarketingSignal {
  id: string;
  title: string;
  source?: string;
  description?: string;
}

export interface MarketingDemandSupplyKeyword {
  keyword: string;
  source?: string;
  average_monthly_searches?: number;
  competition?: string;
  competition_index?: number;
  low_top_of_page_bid?: number;
  high_top_of_page_bid?: number;
  monthly_search_volumes?: Array<{ year?: number; month?: string; monthly_searches?: number }>;
}

export interface MarketingDemandSupplyData {
  provider?: string;
  summary?: {
    analyzed_keywords?: number;
    average_monthly_searches?: number;
    total_monthly_searches?: number;
    average_competition_index?: number;
    competition_level?: string;
    demand_level?: string;
    market_pressure_score?: number;
    suggested_keywords?: number;
  };
  keyword_metrics?: MarketingDemandSupplyKeyword[];
  suggested_keywords?: MarketingDemandSupplyKeyword[];
  warning?: string;
  checked_terms?: string[];
  remaining_terms?: number;
  last_seeds?: { keywords?: string[]; services?: string[] };
}

export interface MarketingPersona {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  economic_status?: string;
  profession?: string;
  challenge?: string;
  need?: string;
  motivation?: string;
  solution?: string;
  avatar_seed?: string;
  avatar_prompt?: string;
}

export interface MarketingIntelligence {
  version: string;
  language?: string;
  generated_at?: string;
  status?: string;
  keywords?: MarketingKeyword[];
  competitors: MarketingCompetitor[];
  demand_signals: MarketingSignal[];
  supply_signals: MarketingSignal[];
  opportunities: MarketingSignal[];
  personas?: MarketingPersona[];
  source_links: MarketingSourceLink[];
  warnings?: string[];
  source_warnings?: string[];
  demand_supply?: MarketingDemandSupplyData;
}

export interface MarketingPlanWorkItem {
  id: string;
  title: string;
  objective?: string;
  platforms?: string[];
  placement?: string;
  recommended_output?: { format?: string; production_mode?: string; [key: string]: unknown };
  prompt?: string;
  needs_user_asset?: boolean;
  notes?: string;
  generation_request?: GenerateContentRequest;
}

export interface MarketingActionItem {
  id: string;
  plan_type: "social" | "ads" | string;
  title: string;
  objective?: string;
  channel?: string;
  platforms?: string[];
  placement?: string;
  output_types?: string[];
  production_mode?: string;
  schedule_window?: string;
  funnel_stage?: string | null;
  required_assets?: string[];
  generation_prompt?: string;
  caption?: string;
  hook?: string;
  source_references?: unknown[];
  status?: string;
  notes?: string;
  user_edits?: unknown[];
  generated_post_ids?: string[];
  generation_request?: GenerateContentRequest;
}

export interface MarketingActionPlan {
  version: string;
  language?: string;
  generated_at?: string;
  status?: string;
  social_items: MarketingActionItem[];
  ad_funnel_items: MarketingActionItem[];
  social_content_plan?: SocialContentWorkPlan;
  paid_content_plan?: PaidContentWorkPlan;
  planning_questions?: string[];
  warnings?: string[];
}

export interface SocialIdeaIntervention {
  type?: string;
  label?: string;
  instructions?: string;
  required_assets?: string[];
}

export interface SocialIdeaGeneration {
  status?: "idle" | "queued" | "generating" | "ready" | "failed" | string;
  job_id?: string;
  post_id?: string | null;
  queued_at?: string;
  generated_at?: string;
  error?: string;
}

export interface SocialContentIdea {
  id: string;
  type: "attraction" | "trust" | "sales" | string;
  title: string;
  format?: string;
  hook_style?: string;
  idea?: string;
  script?: string;
  cta?: string;
  rationale?: string;
  production_mode?: string;
  ai_capability?: "ai" | "user_recommended" | "user_required" | string;
  user_intervention?: SocialIdeaIntervention | null;
  generation?: SocialIdeaGeneration;
  scheduled_date?: string | null;
  edited_by_user?: boolean;
  provider?: string;
}

export interface SocialPlanScheduleDay {
  date: string;
  item_ids: string[];
}

export interface SocialPlanSchedule {
  plan_type?: "weekly" | "monthly" | string;
  start_date?: string;
  end_date?: string;
  days?: SocialPlanScheduleDay[];
}

export interface SocialContentWorkPlan {
  version?: string;
  status?: string;
  language?: string;
  dialect?: string;
  generated_at?: string;
  plan_type?: "weekly" | "monthly" | string;
  monthly_posts?: number;
  schedule?: SocialPlanSchedule;
  cadence?: {
    recommended_monthly_posts?: number;
    recommended_note?: string;
  };
  content_mix?: Array<{
    type: "attraction" | "trust" | "sales" | string;
    label?: string;
    percentage?: number;
    required_count?: number;
    candidate_count?: number;
  }>;
  candidates?: Record<string, SocialContentIdea[]>;
  selected_ids?: string[];
  warnings?: string[];
}

export interface PaidContentIdea {
  id: string;
  stage: "awareness" | "consideration" | "conversion" | "loyalty" | "advocacy" | string;
  stage_label?: string;
  stage_en?: string;
  goal?: string;
  idea?: string;
  activities?: string[];
  title: string;
  ad_format?: "video" | "image_banner" | "carousel" | string;
  channel?: string;
  hook?: string;
  visual_idea?: string;
  copy?: string;
  cta?: string;
  required_assets?: string[];
  extra_requirements?: string[];
  prompt?: string;
  rationale?: string;
  provider?: string;
}

export interface PaidContentWorkPlan {
  version?: string;
  status?: string;
  language?: string;
  dialect?: string;
  generated_at?: string;
  stages?: Array<{
    key: string;
    stage?: string;
    label?: string;
    goal?: string;
    idea?: string;
    activities?: string[];
    required_count?: number;
    candidate_count?: number;
  }>;
  candidates?: Record<string, PaidContentIdea[]>;
  selected_ids?: string[];
  warnings?: string[];
}

export interface MarketingPlanFunnelStage {
  stage: string;
  goal?: string;
  audience?: string;
  budget_direction?: string;
  content_ideas?: Array<{
    id: string;
    title: string;
    recommended_outputs?: string[];
    prompt?: string;
    notes?: string;
    generation_request?: GenerateContentRequest;
  }>;
}

export interface PlanVisual {
  kind: "cover" | "audience" | "services" | string;
  url: string;
}

export interface MarketingPlanResponse {
  status: "missing" | "ready" | string;
  suite_id: string;
  language?: string;
  deck: MarketingPlanDeck | null;
  intelligence?: MarketingIntelligence;
  action_plan?: MarketingActionPlan;
  visuals?: PlanVisual[];
  generation_status?: GenerationStatus | null;
}

export interface PublicMarketingPlanResponse {
  locked: boolean;
  suite_name?: string;
  deck?: MarketingPlanDeck;
  share?: MarketingPlanShare;
}

export interface InsightPoint { date: string; value: number }

export interface AnalyticsData {
  days: number;
  error?: string;
  errors?: string[];
  facebook?: {
    name?: string;
    fans?: number;
    followers?: number;
    insights?: {
      page_impressions?: InsightPoint[];
      page_impressions_unique?: InsightPoint[];
      page_reach?: InsightPoint[];
      views?: InsightPoint[];
      page_post_engagements?: InsightPoint[];
      page_engaged_users?: InsightPoint[];
      page_fan_adds?: InsightPoint[];
    };
    recent_posts?: {
      id: string; message: string; created_time: string;
      image?: string; likes: number; comments: number; shares: number;
    }[];
  };
  instagram?: {
    username?: string;
    followers?: number;
    media_count?: number;
    profile_picture?: string;
    insights?: {
      impressions?: InsightPoint[];
      views?: InsightPoint[];
      reach?: InsightPoint[];
      profile_views?: InsightPoint[];
      follower_count?: InsightPoint[];
    };
    recent_media?: {
      id: string; caption: string; media_type: string;
      timestamp: string; likes: number; comments: number;
      image?: string; url?: string;
    }[];
  };
}

export interface Subscription {
  suite_id: string;
  tier: "solo" | "team" | "enterprise";
  status: "active" | "frozen" | "cancelled";
  seat_count: number;
  credit_balance: number;
  generation_token_balance: number;
  marketing_budget_balance_usd: number;
  monthly_generation_token_grant: number;
  auto_pay_enabled: boolean;
  monthly_total: number;
  price_per_seat: number;
  freeze_threshold: number;
}

export interface UsageEvent {
  id: string;
  event_type: string;
  ledger_account?: string;
  billing_event_type?: string;
  amount_tokens?: number;
  balance_after_tokens?: number | null;
  amount_usd?: number;
  balance_after_usd?: number | null;
  actual_cost_usd: number;
  billed_amount: number;
  external_ref?: string | null;
  idempotency_key?: string | null;
  event_data?: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminSummary {
  users: number;
  active_users: number;
  suites: number;
  generation_jobs: number;
  provider_cost_usd: number;
  billed_amount_usd: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  is_super_admin: boolean;
  suite_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface AdminProvider {
  provider: string;
  configured: boolean;
  models: string[];
  operations: string[];
}

export interface AppTextOverride {
  id: string;
  language: string;
  key: string;
  value: string;
  updated_by_email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppTextPublicResponse {
  language: string;
  overrides: Record<string, string>;
  updated_at?: string | null;
}

export interface AdminAppTextResponse {
  language: string;
  overrides: AppTextOverride[];
}

export interface AdminAppTextUpdateResponse {
  ok: boolean;
  language: string;
  key: string;
  override?: AppTextOverride | null;
}

export interface AdminBillingUsageEvent {
  id: string;
  suite_id: string;
  suite_name?: string | null;
  owner_email?: string | null;
  event_type: string;
  ledger_account: string;
  billing_event_type: string;
  amount_tokens: number;
  balance_after_tokens?: number | null;
  amount_usd: number;
  balance_after_usd?: number | null;
  actual_cost_usd: number;
  billed_amount: number;
  external_ref?: string | null;
  idempotency_key?: string | null;
  event_data: Record<string, unknown>;
  provider?: string | null;
  model?: string | null;
  operation?: string | null;
  cost_basis?: string | null;
  created_at: string;
}

export interface AdminSuiteSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  ai_generation_enabled: boolean;
  auto_publish_enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AdminUserDetail {
  user: AdminUser;
  suites: AdminSuiteSummary[];
}

export interface AuditLog {
  id: string;
  actor_user_id?: string | null;
  actor_email?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  suite_id?: string | null;
  target_user_id?: string | null;
  metadata: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface ProviderUsageEvent {
  id: string;
  provider: string;
  model?: string | null;
  endpoint?: string | null;
  operation: string;
  status: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  actual_cost_usd: number;
  suite_id?: string | null;
  user_id?: string | null;
  generation_job_id?: string | null;
  latency_ms?: number | null;
  request_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProviderUsageSummary {
  provider: string;
  model?: string | null;
  requests: number;
  total_tokens: number;
  actual_cost_usd: number;
  successes: number;
}

export interface CreativeAsset {
  id: string;
  kind: string;
  title: string;
  storage_url: string;
  source_url?: string | null;
  content_type?: string | null;
  duration_seconds?: number | null;
  tags: string[];
  use_cases: string[];
  classification: Record<string, unknown>;
  active: boolean;
  usage_count: number;
  last_used_at?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Connections {
  facebook?: { connected: boolean; page_id: string; page_name: string };
  instagram?: { connected: boolean; ig_user_id: string; username: string };
  meta_ads?: { connected: boolean; ad_account_id: string; ad_account_name?: string; currency?: string };
  google_ads?: { connected: boolean; customer_id: string; customer_name?: string; user_email?: string; user_name?: string };
  tiktok?: { connected: boolean; username: string };
}

export interface GoogleAdsCustomer {
  id: string;
  resource_name: string;
  name?: string;
  currency_code?: string;
  time_zone?: string;
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  average_cpc: number;
}

export interface GoogleAdsAd {
  id: string;
  name: string;
  status?: string;
  type?: string;
  metrics: GoogleAdsMetrics;
}

export interface GoogleAdsAdGroup {
  id: string;
  name: string;
  status?: string;
  type?: string;
  metrics: GoogleAdsMetrics;
  ads: GoogleAdsAd[];
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status?: string;
  channel_type?: string;
  start_date?: string;
  end_date?: string;
  metrics: GoogleAdsMetrics;
  ad_groups: GoogleAdsAdGroup[];
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; name: string; username: string; profile_picture_url?: string };
}

export interface MetaAdAccount {
  id: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  business?: { name?: string };
}

export interface MetaCampaign {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  objective?: string;
  buying_type?: string;
  created_time?: string;
  updated_time?: string;
  insights?: MetaInsightsEdge;
  adsets?: { data: MetaAdSet[] };
}

export interface MetaAdSet {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy?: string;
  optimization_goal?: string;
  created_time?: string;
  updated_time?: string;
  insights?: MetaInsightsEdge;
  ads?: { data: MetaAccountAd[] };
}

export interface MetaAccountAd {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  created_time?: string;
  updated_time?: string;
  creative?: {
    id?: string;
    name?: string;
    effective_object_story_id?: string;
    object_story_spec?: Record<string, unknown>;
  };
  insights?: MetaInsightsEdge;
}

export interface MetaInsightsEdge {
  data?: MetaInsightSummary[];
}

export interface MetaInsightSummary {
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  actions?: Array<{ action_type?: string; value?: string }>;
}

export interface Suite {
  id: string;
  name: string;
  slug: string;
  status: "onboarding" | "active" | "suspended";
  brand: Brand | null;
  strategy: MarketingStrategy | null;
}

export interface StorageStatus {
  configured: boolean;
  backend: "r2" | "local";
  public: boolean;
  bucket_configured: boolean;
  public_url_configured: boolean;
  missing: string[];
  warnings: string[];
}

export interface StorageTestResult extends StorageStatus {
  ok: boolean;
  uploaded: boolean;
  public_fetch_ok: boolean;
  status_code?: number;
  url?: string;
  key?: string;
  error?: string | null;
}

export interface MediaReadinessItem {
  url: string;
  backend?: string;
  public?: boolean;
  publish_ready?: boolean;
}

export interface MediaReadiness {
  state?: "ready" | "missing" | "failed" | "local-only" | "unsupported" | "not_required" | "not-required" | string | null;
  publish_ready?: boolean;
  reason?: string | null;
  items?: MediaReadinessItem[];
}

export interface Post {
  id: string;
  format: "image" | "carousel" | "video";
  status: "pending" | "approved" | "rejected" | "scheduled" | "published";
  topic: string | null;
  caption: string | null;
  hashtags: string[] | null;
  media_urls: string[] | null;
  media_readiness?: MediaReadiness | "ready" | "missing" | "failed" | "local-only" | "unsupported" | "not_required" | "not-required" | string | null;
  media_readiness_reason?: string | null;
  media_missing_reason?: string | null;
  media_ready?: boolean | null;
  media_public_url?: string | null;
  media_public_urls?: string[] | null;
  media_local_only?: boolean | null;
  ai_metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GenerateContentRequest {
  count?: number;
  prompt?: string;
  mode?: "quick" | "anything" | "set" | "loop" | "campaign" | "product_bulk" | "image" | "video" | "carousel";
  content_type?: "mixed" | "image" | "video" | "carousel";
  aspect_ratio?: string;
  destination?: string;
  model_tier?: string;
  use_brand?: boolean;
  language?: string;
  creative_brief?: Record<string, unknown>;
}

export interface QuickAssetUploadResult {
  id: string;
  kind: "logo" | "product" | "style" | "character" | "icon";
  name: string;
  url: string;
  size: number;
  storage: {
    url: string;
    backend: string;
    key?: string | null;
    public: boolean;
    content_type: string;
  };
}

export interface ProductBulkAsset {
  id: string;
  item_id: string;
  template_direction_id?: string | null;
  status: "pending" | "generating" | "generated" | "approved" | "rejected" | "failed";
  media_url?: string | null;
  media_type: string;
  feedback?: string | null;
  ai_metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProductBulkItem {
  id: string;
  row_index: number;
  product_name: string;
  image_ref?: string | null;
  image_url?: string | null;
  slogan?: string | null;
  description?: string | null;
  price?: string | null;
  global_addition?: string | null;
  notes?: string | null;
  raw_row?: Record<string, unknown> | null;
  status: "pending" | "first_sample" | "generating" | "generated" | "approved" | "rejected" | "failed";
  assets: ProductBulkAsset[];
}

export interface ProductTemplateDirection {
  id: string;
  name: string;
  description?: string | null;
  visual_rules?: Record<string, unknown> | null;
  prompt_rules?: Record<string, unknown> | null;
  sample_asset_id?: string | null;
  status: "candidate" | "approved" | "rejected";
}

export interface ProductBulkBatch {
  id: string;
  suite_id: string;
  name: string;
  status:
    | "uploaded"
    | "mapped"
    | "first_generating"
    | "awaiting_template_approval"
    | "approved_template"
    | "generating_all"
    | "completed"
    | "failed"
    | "cancelled";
  source_excel_url?: string | null;
  source_zip_url?: string | null;
  creative_prompt?: string | null;
  column_mapping?: Record<string, unknown> | null;
  approved_template_id?: string | null;
  brand_enabled: boolean;
  total_products: number;
  completed_products: number;
  failed_products: number;
  items: ProductBulkItem[];
  template_directions: ProductTemplateDirection[];
  assets: ProductBulkAsset[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface GenerationStatus {
  suite_id?: string;
  job_id?: string;
  status:
    | "idle"
    | "queued"
    | "waiting_capacity"
    | "waiting_provider_limit"
    | "running"
    | "retrying"
    | "completed"
    | "failed"
    | "cancelled"
    | "timeout";
  stage?: string;
  message?: string;
  progress?: number;
  error?: string;
  safe_error?: string;
  provider?: string | null;
  model?: string | null;
  retry_count?: number;
  next_retry_at?: string | null;
  rate_limit_reset_at?: string | null;
  estimated_wait_seconds?: number | null;
  is_active?: boolean;
  is_terminal?: boolean;
  is_stale?: boolean;
  stale_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  finished_at?: string;
  stages?: Array<{ id: string; label?: string; status?: string; progress?: number }>;
  partial?: Record<string, unknown> | null;
  // Trimmed job input, only returned by list endpoints (e.g. video montage jobs).
  input?: {
    source_url?: string | null;
    source_file_name?: string | null;
    notes?: string | null;
    options?: string[];
    backgrounds_mode?: string | null;
  } | null;
  result?: {
    post_ids?: string[];
    count?: number;
    stages?: Array<{ id: string; label?: string; status?: string; progress?: number }>;
    partial?: Record<string, unknown> | null;
    [key: string]: unknown;
  } | null;
}

export interface SocialLoop {
  id?: string;
  name: string;
  status?: string;
  content_pillars?: Array<{ name: string; percentage?: number; notes?: string }>;
  content_mix?: Array<{ type: string; label?: string; percentage: number }>;
  divisions?: string[];
  formats?: Array<{ type: string; label?: string; enabled: boolean }>;
  cadence?: Record<string, unknown> | null;
  platforms?: string[];
  languages?: string[];
  approval_flow?: Record<string, unknown> | null;
  scheduling_handoff?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface SocialLoopSuggestions {
  content_mix: Array<{ type: string; label: string; percentage: number }>;
  divisions: string[];
  formats: Array<{ type: string; label: string; enabled: boolean }>;
}

export interface BrandReferenceLink {
  label?: string;
  url: string;
  source?: string;
}

export interface Brand {
  account_type?: "business" | "creator" | "agency" | string;
  name?: string;
  tagline?: string;
  description?: string;
  services?: string[];
  products?: string[];
  colors?: { primary?: string; secondary?: string; accent?: string };
  tone?: string;
  industry?: string;
  location?: string;
  website?: string | null;
  logo_url?: string;
  logo_description?: string;
  brand_logos?: BrandLogo[];
  target_audience?: string;
  competitors?: string[];
  unique_value?: string;
  how_they_help?: string;
  esp?: string;
  content_themes?: string[];
  audience_languages?: string[];
  audience_language_names?: string[];
  audience_notes?: string;
  audience_need?: string;
  audience_problem?: string;
  audience_age_range?: string;
  audience_gender?: string;
  audience_behaviors?: string[];
  audience_social_statuses?: string[];
  niche?: string;
  audience_location?: {
    countries: string[];
    cities: string[];
    scope: "world" | "region" | "custom";
  };
  audience_interests?: string[];
  usp_points?: string[];
  esp_points?: string[];
  brand_generated?: {
    logo_url?: string;
    logo_prompt?: string;
    colors_generated?: boolean;
    fonts_generated?: boolean;
  };
  dialect?: string;
  social_links?: { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string; [key: string]: string | undefined };
  reference_links?: BrandReferenceLink[];
  // AI suggestions
  color_palette?: { primary: string; secondary: string; accent: string; reasoning?: string };
  font_suggestions?: string[];
  logo_concepts?: { concept: string }[];
  logo_style?: "icon_only" | "with_name" | "initials";
  logo_source?: "uploaded" | "ai-generated" | "scraped";
  fonts_by_language?: Record<string, Array<{ name: string; url: string; format: string }>>;
  content_rules?: ContentRule[];
  social_loops?: SocialLoop[];
  brand_personas?: BrandPersona[];
  research_debug?: ResearchDebug;
}

export interface ContentRule {
  id: string;
  type: "replace" | "guideline";
  text: string;
  from?: string;
  to?: string;
  source?: string;
  post_id?: string;
  created_at?: string;
}

export interface ContentRuleInput {
  text?: string;
  from?: string;
  to?: string;
}

export interface ResearchSourceReport {
  url: string;
  kind: string;
  status: "ok" | "failed" | "empty" | string;
  error?: string;
  title?: string;
  text_chars?: number;
  description_chars?: number;
  service_candidates?: number;
  recent_posts?: number;
  captions_chars?: number;
}

export interface ResearchDebug {
  source_reports?: ResearchSourceReport[];
  sources_requested?: number;
  sources_ok?: number;
  sources_failed?: number;
  sources_empty?: number;
  search_snippets_chars?: number;
  context_chars?: number;
  ai_elapsed_ms?: number;
  fallbacks_applied?: string[];
  reason?: string;
  ai_output?: {
    has_name?: boolean;
    industry?: string;
    niche?: string;
    services_count?: number;
    products_count?: number;
    content_themes_count?: number;
    audience_interests_count?: number;
  };
  final_output?: {
    has_name?: boolean;
    industry?: string;
    niche?: string;
    services_count?: number;
    products_count?: number;
    content_themes_count?: number;
    audience_interests_count?: number;
  };
}

export interface BrandLogo {
  name: string;
  url: string;
  format?: string;
  width?: number | null;
  height?: number | null;
  shape?: "square" | "horizontal" | "vertical" | "vector" | "unknown";
  background?: "transparent" | "light" | "dark" | "unknown";
}

export interface BrandPersonaImage {
  name: string;
  url: string;
  format?: string;
  width?: number | null;
  height?: number | null;
  shape?: string;
  background?: string;
}

export interface BrandPersona {
  name: string;
  role?: string;
  images: BrandPersonaImage[];
}

export interface CompetitorEntry {
  name: string;
  website: string | null;
  social_links: { instagram: string | null; facebook: string | null; tiktok: string | null };
  google_profile: string | null;
  usp: string;
  esp: string;
}

export interface AudiencePersona {
  name: string;
  age: number;
  profession: string;
  needs: string;
  challenges: string;
}

export interface MarketingPlan {
  services: string[];
  keywords: string[];
  competitors: CompetitorEntry[];
  audience: {
    problem: string;
    demographics: { age: string; gender: string; language: string; social_status: string };
    geography: { countries: string[]; regions: string[]; cities: string[] };
    interests: string[];
    facebook_interests: string[];
    digital_behavior: string;
    personas: AudiencePersona[];
  };
  content_themes: string[];
}

export interface MarketingStrategy {
  marketing_plan: MarketingPlan;
  marketing_message: string;
  language: string;
}

export interface MarketResult {
  title: string;
  url: string;
  snippet: string;
  platform: "instagram" | "tiktok" | "facebook" | "web";
}

export interface MetaAd {
  id: string;
  page_id?: string;
  page_name?: string;
  body?: string;
  title?: string;
  description?: string;
  snapshot_url?: string;
  start_time?: string;
  platforms?: string[];
}
