"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import { api, Brand, BrandReferenceLink, ContentRule, Suite } from "@/lib/api";
import { LANGUAGES } from "@/lib/i18n/translations";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { ExternalLink, ImagePlus, Loader2, Plus, Save, UserPlus, X } from "lucide-react";

type ProfileForm = {
  name: string;
  category: string;
  audienceLanguages: string[];
  dialect: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  linkedin: string;
  referenceLinks: BrandReferenceLink[];
  productsServices: string;
  audienceCountries: string;
  audienceCities: string;
  audienceAgeRange: string;
  audienceGender: string;
  audienceNeed: string;
  audienceNotes: string;
  audienceInterests: string;
  audienceBehaviors: string;
  audienceSegments: string;
  uniqueValue: string;
  esp: string;
  uspPoints: string;
  espPoints: string;
  personaName: string;
};

const emptyForm: ProfileForm = {
  name: "",
  category: "",
  audienceLanguages: [],
  dialect: "",
  website: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  linkedin: "",
  referenceLinks: [],
  productsServices: "",
  audienceCountries: "",
  audienceCities: "",
  audienceAgeRange: "",
  audienceGender: "",
  audienceNeed: "",
  audienceNotes: "",
  audienceInterests: "",
  audienceBehaviors: "",
  audienceSegments: "",
  uniqueValue: "",
  esp: "",
  uspPoints: "",
  espPoints: "",
  personaName: "",
};

export default function BusinessProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const { lang, dir } = useLanguage();
  const sourceLabels = getSourceLinkLabels(lang);
  const [suite, setSuite] = useState<Suite | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "persona" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.suites.get(id)
      .then((data) => {
        setSuite(data);
        setForm(formFromBrand(data.brand || {}));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("suite.profile.loadFailed")))
      .finally(() => setLoading(false));
  }, [id, t]);

  const brand = suite?.brand || {};
  const logos = brand.brand_logos || [];
  const personas = brand.brand_personas || [];
  const selectedLanguages = useMemo(
    () => LANGUAGES.filter((lang) => form.audienceLanguages.includes(lang.code)),
    [form.audienceLanguages]
  );

  async function saveProfile() {
    if (!suite) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const nextBrand = brandFromForm(form, suite.brand || {});
      await api.suites.updateBrand(id, nextBrand);
      setSuite({ ...suite, brand: nextBrand });
      setNotice(t("suite.profile.saved"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("suite.profile.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogos(files?: FileList | File[] | null) {
    if (!files || !suite) return;
    const logoFiles = Array.from(files);
    if (logoFiles.length === 0) return;
    setUploading("logo");
    setNotice("");
    setError("");
    try {
      let latestBrand: Brand | null = null;
      for (const file of logoFiles) {
        const result = await api.onboarding.uploadBrandAsset(id, "logo", file, form.audienceLanguages[0]);
        latestBrand = result.brand;
      }
      if (latestBrand) {
        setSuite({ ...suite, brand: latestBrand });
        setForm(formFromBrand(latestBrand));
      }
      setNotice(logoFiles.length === 1 ? t("suite.profile.logoUploaded") : `${logoFiles.length} ${t("suite.profile.logosUploadedSuffix")}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("suite.profile.logoUploadFailed"));
    } finally {
      setUploading(null);
    }
  }

  async function setPrimaryLogo(url: string) {
    if (!suite) return;
    setNotice("");
    setError("");
    const nextBrand: Brand = { ...(suite.brand || {}), logo_url: url, logo_source: "uploaded" };
    try {
      await api.suites.updateBrand(id, nextBrand);
      setSuite({ ...suite, brand: nextBrand });
      setNotice(t("suite.profile.primaryLogoUpdated"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("suite.profile.primaryLogoFailed"));
    }
  }

  async function uploadPersona(files?: FileList | File[] | null) {
    if (!files || !suite) return;
    const personaFiles = Array.from(files);
    if (personaFiles.length === 0) return;
    const personaName = form.personaName.trim();
    if (!personaName) {
      setError(t("suite.profile.personaNameRequired"));
      return;
    }
    setUploading("persona");
    setNotice("");
    setError("");
    try {
      let latestBrand: Brand | null = null;
      for (const file of personaFiles) {
        const result = await api.onboarding.uploadPersonaAsset(id, file, personaName);
        latestBrand = result.brand;
      }
      if (latestBrand) {
        setSuite({ ...suite, brand: latestBrand });
        setForm({ ...formFromBrand(latestBrand), personaName });
      }
      setNotice(personaFiles.length === 1 ? t("suite.profile.personaUploaded") : `${personaFiles.length} ${t("suite.profile.personasUploadedSuffix")}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("suite.profile.personaUploadFailed"));
    } finally {
      setUploading(null);
    }
  }

  function updateBrandPersonas(nextPersonas: NonNullable<Brand["brand_personas"]>) {
    if (!suite) return;
    const nextBrand: Brand = { ...(suite.brand || {}), brand_personas: nextPersonas };
    setSuite({ ...suite, brand: nextBrand });
  }

  function removePersona(name: string) {
    updateBrandPersonas(personas.filter((persona) => persona.name !== name));
  }

  function removePersonaImage(personaName: string, imageUrl: string) {
    updateBrandPersonas(personas.map((persona) => (
      persona.name === personaName
        ? { ...persona, images: (persona.images || []).filter((image) => image.url !== imageUrl) }
        : persona
    )));
  }

  function addReferenceLink() {
    setForm({ ...form, referenceLinks: [...form.referenceLinks, { label: "", url: "", source: "manual" }] });
  }

  function updateReferenceLink(index: number, field: "label" | "url", value: string) {
    setForm({
      ...form,
      referenceLinks: form.referenceLinks.map((link, i) => i === index ? { ...link, [field]: value } : link),
    });
  }

  function removeReferenceLink(index: number) {
    setForm({ ...form, referenceLinks: form.referenceLinks.filter((_, i) => i !== index) });
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">{t("suite.status.loading")}</div>;
  }

  if (!suite) {
    return <div className="p-8 text-sm text-muted-foreground">{t("suite.status.notFound")}</div>;
  }

  return (
    <SuitePageShell
      title={t("suite.nav.profile")}
      description={t("suite.profile.description")}
      backHref={`/suite/${id}`}
    >
      <div className="space-y-4" dir={dir}>
        {(notice || error) && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
            }`}
            dir="auto"
          >
            {error || notice}
          </div>
        )}

        <ProfileSection title={t("suite.profile.section.business")}>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label={t("suite.profile.field.businessName")} value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <TextField label={t("suite.profile.field.category")} value={form.category} onChange={(category) => setForm({ ...form, category })} />
          </div>
        </ProfileSection>

        <ProfileSection title={sourceLabels.title}>
          <p className="mb-3 text-sm text-muted-foreground" dir="auto">{sourceLabels.description}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <LinkField label={sourceLabels.website} value={form.website} onChange={(website) => setForm({ ...form, website })} placeholder="https://example.com" openLabel={sourceLabels.openLink} />
            <LinkField label="Instagram" value={form.instagram} onChange={(instagram) => setForm({ ...form, instagram })} placeholder="https://instagram.com/..." openLabel={sourceLabels.openLink} />
            <LinkField label="Facebook" value={form.facebook} onChange={(facebook) => setForm({ ...form, facebook })} placeholder="https://facebook.com/..." openLabel={sourceLabels.openLink} />
            <LinkField label="TikTok" value={form.tiktok} onChange={(tiktok) => setForm({ ...form, tiktok })} placeholder="https://tiktok.com/@..." openLabel={sourceLabels.openLink} />
            <LinkField label="LinkedIn" value={form.linkedin} onChange={(linkedin) => setForm({ ...form, linkedin })} placeholder="https://linkedin.com/company/..." openLabel={sourceLabels.openLink} />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">{sourceLabels.moreLinks}</span>
              <button
                type="button"
                onClick={addReferenceLink}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus size={13} /> {sourceLabels.addLink}
              </button>
            </div>
            {form.referenceLinks.length === 0 && (
              <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground" dir="auto">
                {sourceLabels.emptyLinks}
              </p>
            )}
            {form.referenceLinks.map((link, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)_auto] md:items-end">
                <TextField label={sourceLabels.linkLabel} value={link.label || ""} onChange={(label) => updateReferenceLink(index, "label", label)} placeholder={sourceLabels.linkLabelPlaceholder} />
                <LinkField label={sourceLabels.linkUrl} value={link.url || ""} onChange={(url) => updateReferenceLink(index, "url", url)} placeholder="https://..." openLabel={sourceLabels.openLink} />
                <button
                  type="button"
                  onClick={() => removeReferenceLink(index)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-red-400"
                  aria-label={sourceLabels.removeLink}
                  title={sourceLabels.removeLink}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </ProfileSection>

        <ProfileSection title={t("suite.profile.section.languages")}>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => {
              const active = form.audienceLanguages.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setForm({ ...form, audienceLanguages: toggleValue(form.audienceLanguages, lang.code) })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                  dir={lang.dir}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
          {selectedLanguages.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("suite.profile.field.primaryLanguage")} {selectedLanguages[0].label}
            </p>
          )}
          <div className="mt-4 max-w-xl">
            <TextField
              label={t("suite.profile.field.dialect")}
              value={form.dialect}
              onChange={(dialect) => setForm({ ...form, dialect })}
              placeholder={t("suite.profile.field.dialectPlaceholder")}
            />
          </div>
        </ProfileSection>

        <ProfileSection title={t("suite.profile.section.products")}>
          <TextareaField
            label={t("suite.profile.field.products")}
            value={form.productsServices}
            onChange={(productsServices) => setForm({ ...form, productsServices })}
            rows={5}
          />
        </ProfileSection>

        <ProfileSection title={t("suite.profile.section.audience")}>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label={t("suite.profile.field.audienceCountries")} value={form.audienceCountries} onChange={(audienceCountries) => setForm({ ...form, audienceCountries })} placeholder={t("suite.profile.field.audienceCountriesPlaceholder")} />
            <TextField label={t("suite.profile.field.audienceCities")} value={form.audienceCities} onChange={(audienceCities) => setForm({ ...form, audienceCities })} placeholder={t("suite.profile.field.audienceCitiesPlaceholder")} />
            <TextField label={t("suite.profile.field.audienceAgeRange")} value={form.audienceAgeRange} onChange={(audienceAgeRange) => setForm({ ...form, audienceAgeRange })} placeholder={t("suite.profile.field.audienceAgeRangePlaceholder")} />
            <TextField label={t("suite.profile.field.audienceGender")} value={form.audienceGender} onChange={(audienceGender) => setForm({ ...form, audienceGender })} placeholder={t("suite.profile.field.audienceGenderPlaceholder")} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <TextareaField label={t("suite.profile.field.audienceNeed")} value={form.audienceNeed} onChange={(audienceNeed) => setForm({ ...form, audienceNeed })} rows={4} placeholder={t("suite.profile.field.audienceNeedPlaceholder")} />
            <TextareaField label={t("suite.profile.field.audienceNote")} value={form.audienceNotes} onChange={(audienceNotes) => setForm({ ...form, audienceNotes })} rows={4} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <TextareaField label={t("suite.profile.field.interests")} value={form.audienceInterests} onChange={(audienceInterests) => setForm({ ...form, audienceInterests })} />
            <TextareaField label={t("suite.profile.field.behaviors")} value={form.audienceBehaviors} onChange={(audienceBehaviors) => setForm({ ...form, audienceBehaviors })} />
            <TextareaField label={t("suite.profile.field.segments")} value={form.audienceSegments} onChange={(audienceSegments) => setForm({ ...form, audienceSegments })} />
          </div>
        </ProfileSection>

        <ProfileSection title={t("suite.profile.section.value")}>
          <div className="grid gap-3 md:grid-cols-2">
            <TextareaField label={t("suite.profile.field.uniqueValue")} value={form.uniqueValue} onChange={(uniqueValue) => setForm({ ...form, uniqueValue })} rows={4} />
            <TextareaField label={t("suite.profile.field.esp")} value={form.esp} onChange={(esp) => setForm({ ...form, esp })} rows={4} />
            <TextareaField label={t("suite.profile.field.uspPoints")} value={form.uspPoints} onChange={(uspPoints) => setForm({ ...form, uspPoints })} rows={5} />
            <TextareaField label={t("suite.profile.field.espPoints")} value={form.espPoints} onChange={(espPoints) => setForm({ ...form, espPoints })} rows={5} />
          </div>
        </ProfileSection>

        <ProfileSection title={t("suite.profile.section.assets")}>
          <div className="flex flex-wrap items-center gap-3">
            {brand.logo_url && <LogoPreview url={brand.logo_url} label={t("suite.profile.field.primaryLogo")} isPrimary />}
            {logos.filter((logo) => logo.url !== brand.logo_url).map((logo, index) => (
              <LogoPreview
                key={`${logo.url}-${index}`}
                url={logo.url}
                label={logo.shape || logo.name || t("suite.profile.field.logoFallback")}
                isPrimary={brand.logo_url === logo.url}
                onSetPrimary={() => setPrimaryLogo(logo.url)}
                primaryLabel={t("suite.new.primaryLogo")}
                setPrimaryLabel={t("suite.new.setPrimaryLogo")}
              />
            ))}
            <label className="inline-flex min-h-16 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              {uploading === "logo" ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {t("suite.profile.field.uploadLogo")}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  uploadLogos(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </ProfileSection>

        <ProfileSection title={t("suite.profile.section.personas")}>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <TextField label={t("suite.profile.field.personaName")} value={form.personaName} onChange={(personaName) => setForm({ ...form, personaName })} />
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {uploading === "persona" ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {t("suite.profile.field.uploadReference")}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  uploadPersona(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {personas.length > 0 && (
            <div className="mt-4 space-y-3">
              {personas.map((persona) => (
                <div key={persona.name} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground" dir="auto">{persona.name}</p>
                      <p className="text-xs text-muted-foreground">{(persona.images || []).length} {t("suite.new.images")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePersona(persona.name)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-red-400"
                      aria-label={t("suite.new.removePersona")}
                      title={t("suite.new.removePersona")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(persona.images || []).map((image, index) => (
                      <LogoPreview
                        key={`${persona.name}-${image.url}-${index}`}
                        url={image.url}
                        label={image.shape || t("suite.profile.field.referenceFallback")}
                        onRemove={() => removePersonaImage(persona.name, image.url)}
                        removeLabel={t("suite.new.removeImage")}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ProfileSection>

        <ProfileSection title={t("suite.profile.section.rules")}>
          <ContentRulesManager suiteId={id} />
        </ProfileSection>

        <div className="sticky bottom-3 z-10 flex justify-end">
          <Button onClick={saveProfile} disabled={saving} className="gap-2 shadow-lg">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? t("suite.profile.saving") : t("suite.profile.save")}
          </Button>
        </div>
      </div>
    </SuitePageShell>
  );
}

function formFromBrand(brand: Brand): ProfileForm {
  const services = brand.services || brand.products || [];
  return {
    ...emptyForm,
    name: brand.name || "",
    category: brand.niche || brand.industry || "",
    audienceLanguages: brand.audience_languages || [],
    dialect: brand.dialect || "",
    website: brand.website || "",
    instagram: brand.social_links?.instagram || "",
    facebook: brand.social_links?.facebook || "",
    tiktok: brand.social_links?.tiktok || "",
    linkedin: brand.social_links?.linkedin || "",
    referenceLinks: normalizeReferenceLinks(brand.reference_links || []),
    productsServices: toLines(services),
    audienceCountries: toLines(brand.audience_location?.countries),
    audienceCities: toLines(brand.audience_location?.cities),
    audienceAgeRange: brand.audience_age_range || "",
    audienceGender: brand.audience_gender || "",
    audienceNeed: brand.audience_need || brand.audience_problem || "",
    audienceNotes: brand.audience_notes || brand.target_audience || "",
    audienceInterests: toLines(brand.audience_interests),
    audienceBehaviors: toLines(brand.audience_behaviors),
    audienceSegments: toLines(brand.audience_social_statuses),
    uniqueValue: brand.unique_value || brand.how_they_help || "",
    esp: brand.esp || "",
    uspPoints: toLines(brand.usp_points),
    espPoints: toLines(brand.esp_points),
  };
}

function brandFromForm(form: ProfileForm, current: Brand): Brand {
  const productsServices = fromLines(form.productsServices);
  const category = form.category.trim();
  const uniqueValue = form.uniqueValue.trim();
  const esp = form.esp.trim();
  return {
    ...current,
    name: form.name.trim(),
    industry: category,
    niche: category,
    services: productsServices,
    products: current.products || [],
    website: form.website.trim() || null,
    social_links: {
      ...(current.social_links || {}),
      instagram: form.instagram.trim() || undefined,
      facebook: form.facebook.trim() || undefined,
      tiktok: form.tiktok.trim() || undefined,
      linkedin: form.linkedin.trim() || undefined,
    },
    reference_links: normalizeReferenceLinks(form.referenceLinks),
    audience_languages: form.audienceLanguages,
    audience_language_names: form.audienceLanguages.map((code) => LANGUAGES.find((lang) => lang.code === code)?.label || code),
    dialect: form.dialect.trim(),
    audience_location: {
      scope: form.audienceCountries.trim() || form.audienceCities.trim() ? "custom" : current.audience_location?.scope || "world",
      countries: fromLines(form.audienceCountries),
      cities: fromLines(form.audienceCities),
    },
    audience_age_range: form.audienceAgeRange.trim(),
    audience_gender: form.audienceGender.trim(),
    audience_need: form.audienceNeed.trim(),
    audience_problem: form.audienceNeed.trim(),
    target_audience: form.audienceNotes.trim(),
    audience_notes: form.audienceNotes.trim(),
    audience_interests: fromLines(form.audienceInterests),
    audience_behaviors: fromLines(form.audienceBehaviors),
    audience_social_statuses: fromLines(form.audienceSegments),
    unique_value: uniqueValue,
    how_they_help: uniqueValue,
    esp,
    usp_points: fromLines(form.uspPoints),
    esp_points: fromLines(form.espPoints),
    // content_rules are managed via the dedicated content-rules endpoints; never overwrite here.
    content_rules: current.content_rules,
  };
}

function normalizeReferenceLinks(links: BrandReferenceLink[]): BrandReferenceLink[] {
  const seen = new Set<string>();
  return (links || [])
    .map((link) => ({
      label: (link.label || "").trim(),
      url: (link.url || "").trim(),
      source: link.source || "manual",
    }))
    .filter((link) => {
      if (!link.url) return false;
      const key = link.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getSourceLinkLabels(lang: string) {
  if (lang === "he") {
    return {
      title: "קישורי מקור",
      description: "הקישורים שהלקוח הזין נשמרים כאן, ואפשר להוסיף עוד מקורות שנשתמש בהם להבנת העסק.",
      website: "אתר ראשי",
      moreLinks: "קישורים נוספים",
      addLink: "הוסף קישור",
      emptyLinks: "אין עדיין קישורים נוספים. אפשר להוסיף אתר, קטלוג, תיק עבודות או כל מקור חשוב.",
      linkLabel: "שם הקישור",
      linkLabelPlaceholder: "קטלוג / תיק עבודות / דף נחיתה",
      linkUrl: "URL",
      removeLink: "הסר קישור",
      openLink: "פתח קישור",
    };
  }
  if (lang === "ar") {
    return {
      title: "روابط المصادر",
      description: "الروابط التي أدخلها العميل محفوظة هنا، ويمكن إضافة روابط أخرى نستخدمها كمرجع لفهم المصلحة.",
      website: "الموقع الرئيسي",
      moreLinks: "روابط إضافية",
      addLink: "إضافة رابط",
      emptyLinks: "لا توجد روابط إضافية بعد. يمكن إضافة كتالوج، صفحة هبوط، ملف أعمال أو أي مصدر مهم.",
      linkLabel: "اسم الرابط",
      linkLabelPlaceholder: "كتالوج / ملف أعمال / صفحة هبوط",
      linkUrl: "الرابط",
      removeLink: "حذف الرابط",
      openLink: "فتح الرابط",
    };
  }
  return {
    title: "Source links",
    description: "Client-provided links stay here, and you can add more sources for business research and references.",
    website: "Main website",
    moreLinks: "Additional links",
    addLink: "Add link",
    emptyLinks: "No additional links yet. Add a catalog, portfolio, landing page, or any useful source.",
    linkLabel: "Link label",
    linkLabelPlaceholder: "Catalog / portfolio / landing page",
    linkUrl: "URL",
    removeLink: "Remove link",
    openLink: "Open link",
  };
}

function fromLines(value: string): string[] {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function toLines(value?: string[]): string {
  return (value || []).join("\n");
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function ContentRulesManager({ suiteId }: { suiteId: string }) {
  const t = useT();
  const [rules, setRules] = useState<ContentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"replace" | "guideline">("replace");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [guidelineText, setGuidelineText] = useState("");
  const [teachText, setTeachText] = useState("");
  const [suggestions, setSuggestions] = useState<ContentRule[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.suites.contentRules(suiteId)
      .then((res) => setRules(res.rules || []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [suiteId]);

  async function addRule() {
    const input = mode === "replace"
      ? { from: fromText.trim(), to: toText.trim() }
      : { text: guidelineText.trim() };
    if (mode === "replace" ? !input.from || !input.to : !input.text) return;
    setBusy("add");
    setError("");
    try {
      const res = await api.suites.addContentRules(suiteId, [input]);
      setRules(res.rules || []);
      setFromText("");
      setToText("");
      setGuidelineText("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteRule(ruleId: string) {
    setBusy(`delete-${ruleId}`);
    setError("");
    try {
      const res = await api.suites.deleteContentRule(suiteId, ruleId);
      setRules(res.rules || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function teach() {
    const feedback = teachText.trim();
    if (!feedback) return;
    setBusy("teach");
    setError("");
    try {
      const res = await api.suites.teachContentRules(suiteId, { feedback });
      setSuggestions(res.suggestions || []);
      if (!res.suggestions?.length) setError(t("suite.profile.rules.noSuggestions"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Teach failed");
    } finally {
      setBusy(null);
    }
  }

  async function confirmSuggestion(rule: ContentRule) {
    setBusy(`confirm-${rule.id}`);
    setError("");
    try {
      const res = await api.suites.addContentRules(
        suiteId,
        [{ text: rule.type === "guideline" ? rule.text : "", from: rule.from || "", to: rule.to || "" }],
        "taught"
      );
      setRules(res.rules || []);
      setSuggestions((current) => current.filter((item) => item.id !== rule.id));
      setTeachText("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  function ruleLabel(rule: ContentRule) {
    if (rule.type === "replace") {
      return `"${rule.from}" ← "${rule.to}"`;
    }
    return rule.text;
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">{t("suite.profile.rules.loading")}</div>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}</div>}

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground">{t("suite.profile.rules.teachTitle")}</p>
        <div className="mt-2 flex gap-2">
          <input
            value={teachText}
            onChange={(e) => setTeachText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && teach()}
            placeholder={t("suite.profile.rules.teachPlaceholder")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            dir="auto"
          />
          <Button type="button" onClick={teach} disabled={busy === "teach" || !teachText.trim()} className="shrink-0 gap-2">
            {busy === "teach" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {t("suite.profile.rules.teach")}
          </Button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("suite.profile.rules.suggestionsTitle")}</p>
            {suggestions.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant={rule.type === "replace" ? "default" : "secondary"}>
                    {rule.type === "replace" ? t("suite.profile.rules.replaceType") : t("suite.profile.rules.guidelineType")}
                  </Badge>
                  <span className="truncate text-sm" dir="auto">{ruleLabel(rule)}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="sm" onClick={() => confirmSuggestion(rule)} disabled={busy === `confirm-${rule.id}`}>
                    {busy === `confirm-${rule.id}` ? <Loader2 size={13} className="animate-spin" /> : t("suite.profile.rules.confirm")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSuggestions((current) => current.filter((item) => item.id !== rule.id))}
                  >
                    <X size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("suite.profile.rules.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant={rule.type === "replace" ? "default" : "secondary"}>
                  {rule.type === "replace" ? t("suite.profile.rules.replaceType") : t("suite.profile.rules.guidelineType")}
                </Badge>
                <span className="truncate text-sm" dir="auto" title={ruleLabel(rule)}>{ruleLabel(rule)}</span>
              </div>
              <button
                type="button"
                onClick={() => deleteRule(rule.id)}
                disabled={busy === `delete-${rule.id}`}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-red-600"
                aria-label={t("suite.profile.rules.delete")}
                title={t("suite.profile.rules.delete")}
              >
                {busy === `delete-${rule.id}` ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-border p-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("replace")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${mode === "replace" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {t("suite.profile.rules.replaceType")}
          </button>
          <button
            type="button"
            onClick={() => setMode("guideline")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${mode === "guideline" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {t("suite.profile.rules.guidelineType")}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          {mode === "replace" ? (
            <>
              <div className="min-w-36 flex-1">
                <TextField label={t("suite.profile.rules.from")} value={fromText} onChange={setFromText} placeholder="شيقل" />
              </div>
              <div className="min-w-36 flex-1">
                <TextField label={t("suite.profile.rules.to")} value={toText} onChange={setToText} placeholder="شيكل" />
              </div>
            </>
          ) : (
            <div className="min-w-52 flex-1">
              <TextField
                label={t("suite.profile.rules.guidelineType")}
                value={guidelineText}
                onChange={setGuidelineText}
                placeholder={t("suite.profile.rulesPlaceholder")}
              />
            </div>
          )}
          <Button type="button" variant="outline" onClick={addRule} disabled={busy === "add"} className="gap-2">
            {busy === "add" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {t("suite.profile.rules.add")}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("suite.profile.rules.hint")}</p>
      </div>
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        dir="auto"
      />
    </label>
  );
}

function LinkField(props: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; openLabel?: string }) {
  const href = normalizeExternalHref(props.value);
  return (
    <div className="relative">
      <TextField {...props} type="url" />
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="absolute end-2 top-7 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={props.openLabel || "Open link"}
          title={props.openLabel || "Open link"}
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

function normalizeExternalHref(value: string) {
  const url = value.trim();
  if (!url) return "";
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  return `https://${url}`;
}

function TextareaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        dir="auto"
      />
    </label>
  );
}

function LogoPreview({
  url,
  label,
  isPrimary = false,
  onSetPrimary,
  primaryLabel,
  setPrimaryLabel,
  onRemove,
  removeLabel,
}: {
  url: string;
  label: string;
  isPrimary?: boolean;
  onSetPrimary?: () => void;
  primaryLabel?: string;
  setPrimaryLabel?: string;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const t = useT();
  const resolvedPrimaryLabel = primaryLabel || t("suite.new.primaryLogo");
  const resolvedSetPrimaryLabel = setPrimaryLabel || t("suite.new.setPrimaryLogo");
  const resolvedRemoveLabel = removeLabel || t("suite.new.removeImage");
  return (
    <div className="group relative space-y-1">
      <div className="grid h-16 w-16 place-items-center rounded-lg border border-border bg-muted/40 p-2">
        <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-red-400"
          aria-label={resolvedRemoveLabel}
          title={resolvedRemoveLabel}
        >
          <X size={12} />
        </button>
      )}
      <Badge variant="outline" className="max-w-24 truncate text-[10px]" dir="auto">{label}</Badge>
      {onSetPrimary && (
        <button
          type="button"
          onClick={onSetPrimary}
          className={`block w-16 rounded-md border px-1.5 py-1 text-[10px] transition-colors ${
            isPrimary
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-border text-muted-foreground hover:bg-background hover:text-foreground"
          }`}
        >
          {isPrimary ? resolvedPrimaryLabel : resolvedSetPrimaryLabel}
        </button>
      )}
    </div>
  );
}
