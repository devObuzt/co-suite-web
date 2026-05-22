const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cosuite_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(!(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
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
  },

  suites: {
    list: () => request<Suite[]>("/suites/"),
    create: (data: { name: string; website_url?: string }) =>
      request<Suite>("/suites/", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<Suite>(`/suites/${id}`),
    marketResearch: (suiteId: string) =>
      request<{ results: MarketResult[] }>(`/suites/${suiteId}/market-research`),
    metaAds: (suiteId: string) =>
      request<{ ads: MetaAd[]; library_url: string; query?: string; countries?: string[]; warning?: string }>(
        `/suites/${suiteId}/meta-ads`
      ),
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
    }) => request<{ brand: Brand }>("/onboarding/extract-brand", { method: "POST", body: JSON.stringify(data) }),
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
  },

  content: {
    generate: (suiteId: string) =>
      request<{ message: string }>(`/content/${suiteId}/generate`, { method: "POST", body: "{}" }),
    list: (suiteId: string, status?: string) =>
      request<Post[]>(`/content/${suiteId}${status ? `?status=${status}` : ""}`),
    approve: (suiteId: string, postId: string) =>
      request<{ ok: boolean }>(`/content/${suiteId}/${postId}/approve`, { method: "POST", body: "{}" }),
    reject: (suiteId: string, postId: string) =>
      request<{ ok: boolean }>(`/content/${suiteId}/${postId}/reject`, { method: "POST", body: "{}" }),
    regenerate: (suiteId: string, postId: string) =>
      request<{ message: string }>(`/content/${suiteId}/${postId}/regenerate`, { method: "POST", body: "{}" }),
    publish: (suiteId: string, postId: string, platforms: string[] = ["facebook", "instagram"]) =>
      request<{ ok: boolean; results: Record<string, string>; status: string }>(
        `/content/${suiteId}/${postId}/publish`,
        { method: "POST", body: JSON.stringify({ platforms }) }
      ),
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
  auto_pay_enabled: boolean;
  monthly_total: number;
  price_per_seat: number;
  freeze_threshold: number;
}

export interface UsageEvent {
  id: string;
  event_type: string;
  actual_cost_usd: number;
  billed_amount: number;
  created_at: string;
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

export interface Post {
  id: string;
  format: "image" | "carousel" | "video";
  status: "pending" | "approved" | "rejected" | "scheduled" | "published";
  topic: string | null;
  caption: string | null;
  hashtags: string[] | null;
  media_urls: string[] | null;
  ai_metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Brand {
  name?: string;
  tagline?: string;
  description?: string;
  services?: string[];
  products?: string[];
  colors?: { primary?: string; secondary?: string; accent?: string };
  tone?: string;
  industry?: string;
  location?: string;
  logo_url?: string;
  logo_description?: string;
  target_audience?: string;
  competitors?: string[];
  unique_value?: string;
  how_they_help?: string;
  esp?: string;
  audience_languages?: string[];
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
  social_links?: { instagram?: string; facebook?: string; tiktok?: string };
  // AI suggestions
  color_palette?: { primary: string; secondary: string; accent: string; reasoning?: string };
  font_suggestions?: string[];
  logo_concepts?: { concept: string }[];
  logo_style?: "icon_only" | "with_name" | "initials";
  logo_source?: "uploaded" | "ai-generated" | "scraped";
  fonts_by_language?: Record<string, Array<{ name: string; url: string; format: string }>>;
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
