"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import { api, Brand, Suite } from "@/lib/api";
import { LANGUAGES } from "@/lib/i18n/translations";
import { useT } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuitePageShell } from "@/components/suite/SuitePageShell";
import { ImagePlus, Loader2, Save, UserPlus, X } from "lucide-react";

type ProfileForm = {
  name: string;
  category: string;
  audienceLanguages: string[];
  productsServices: string;
  audienceNotes: string;
  audienceInterests: string;
  audienceBehaviors: string;
  audienceSegments: string;
  uniqueValue: string;
  esp: string;
  uspPoints: string;
  espPoints: string;
  contentRules: string;
  personaName: string;
};

const emptyForm: ProfileForm = {
  name: "",
  category: "",
  audienceLanguages: [],
  productsServices: "",
  audienceNotes: "",
  audienceInterests: "",
  audienceBehaviors: "",
  audienceSegments: "",
  uniqueValue: "",
  esp: "",
  uspPoints: "",
  espPoints: "",
  contentRules: "",
  personaName: "",
};

export default function BusinessProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load Suite profile"))
      .finally(() => setLoading(false));
  }, [id]);

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
      setNotice("Profile saved.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Profile save failed");
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
      setNotice(logoFiles.length === 1 ? "Logo uploaded." : `${logoFiles.length} logos uploaded and classified.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Logo upload failed");
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
      setNotice("Primary logo updated.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Primary logo update failed");
    }
  }

  async function uploadPersona(files?: FileList | File[] | null) {
    if (!files || !suite) return;
    const personaFiles = Array.from(files);
    if (personaFiles.length === 0) return;
    const personaName = form.personaName.trim();
    if (!personaName) {
      setError("Enter a persona name before uploading reference images.");
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
      setNotice(personaFiles.length === 1 ? "Persona reference uploaded." : `${personaFiles.length} persona references uploaded.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Persona upload failed");
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

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!suite) {
    return <div className="p-8 text-sm text-muted-foreground">Suite not found.</div>;
  }

  return (
    <SuitePageShell
      title="Brand/Profile"
      description="Edit the current Suite's business, audience, message, assets, and feedback rules."
      backHref={`/suite/${id}`}
    >
      <div className="space-y-4">
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

        <ProfileSection title="Business">
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Business name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <TextField label="Category" value={form.category} onChange={(category) => setForm({ ...form, category })} />
          </div>
        </ProfileSection>

        <ProfileSection title="Audience Languages">
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
              Primary language: {selectedLanguages[0].label}
            </p>
          )}
        </ProfileSection>

        <ProfileSection title="Products & Services">
          <TextareaField
            label="One product or service per line"
            value={form.productsServices}
            onChange={(productsServices) => setForm({ ...form, productsServices })}
            rows={5}
          />
        </ProfileSection>

        <ProfileSection title="Target Audience">
          <TextareaField label="Audience note" value={form.audienceNotes} onChange={(audienceNotes) => setForm({ ...form, audienceNotes })} rows={4} />
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <TextareaField label="Interests" value={form.audienceInterests} onChange={(audienceInterests) => setForm({ ...form, audienceInterests })} />
            <TextareaField label="Behaviors" value={form.audienceBehaviors} onChange={(audienceBehaviors) => setForm({ ...form, audienceBehaviors })} />
            <TextareaField label="Segments" value={form.audienceSegments} onChange={(audienceSegments) => setForm({ ...form, audienceSegments })} />
          </div>
        </ProfileSection>

        <ProfileSection title="USP / ESP">
          <div className="grid gap-3 md:grid-cols-2">
            <TextareaField label="Unique selling proposition" value={form.uniqueValue} onChange={(uniqueValue) => setForm({ ...form, uniqueValue })} rows={4} />
            <TextareaField label="Emotional selling proposition" value={form.esp} onChange={(esp) => setForm({ ...form, esp })} rows={4} />
            <TextareaField label="USP points" value={form.uspPoints} onChange={(uspPoints) => setForm({ ...form, uspPoints })} rows={5} />
            <TextareaField label="ESP points" value={form.espPoints} onChange={(espPoints) => setForm({ ...form, espPoints })} rows={5} />
          </div>
        </ProfileSection>

        <ProfileSection title="Logos / Assets">
          <div className="flex flex-wrap items-center gap-3">
            {brand.logo_url && <LogoPreview url={brand.logo_url} label="Primary logo" isPrimary />}
            {logos.filter((logo) => logo.url !== brand.logo_url).map((logo, index) => (
              <LogoPreview
                key={`${logo.url}-${index}`}
                url={logo.url}
                label={logo.shape || logo.name || "logo"}
                isPrimary={brand.logo_url === logo.url}
                onSetPrimary={() => setPrimaryLogo(logo.url)}
                primaryLabel={t("suite.new.primaryLogo")}
                setPrimaryLabel={t("suite.new.setPrimaryLogo")}
              />
            ))}
            <label className="inline-flex min-h-16 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              {uploading === "logo" ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              Upload logo
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

        <ProfileSection title="Personas / Reference Images">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <TextField label="Persona name" value={form.personaName} onChange={(personaName) => setForm({ ...form, personaName })} />
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {uploading === "persona" ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Upload reference
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
                        label={image.shape || "reference"}
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

        <ProfileSection title="Content Rules Learned From Feedback">
          <TextareaField
            label="One rule per line"
            value={form.contentRules}
            onChange={(contentRules) => setForm({ ...form, contentRules })}
            rows={6}
            placeholder="Avoid formal Arabic. Use short hooks. Never mention prices without approval."
          />
        </ProfileSection>

        <div className="sticky bottom-3 z-10 flex justify-end">
          <Button onClick={saveProfile} disabled={saving} className="gap-2 shadow-lg">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save profile"}
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
    productsServices: toLines(services),
    audienceNotes: brand.audience_notes || brand.target_audience || "",
    audienceInterests: toLines(brand.audience_interests),
    audienceBehaviors: toLines(brand.audience_behaviors),
    audienceSegments: toLines(brand.audience_social_statuses),
    uniqueValue: brand.unique_value || brand.how_they_help || "",
    esp: brand.esp || "",
    uspPoints: toLines(brand.usp_points),
    espPoints: toLines(brand.esp_points),
    contentRules: (brand.content_rules || []).map((rule) => rule.text).join("\n"),
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
    audience_languages: form.audienceLanguages,
    audience_language_names: form.audienceLanguages.map((code) => LANGUAGES.find((lang) => lang.code === code)?.label || code),
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
    content_rules: fromLines(form.contentRules).map((text) => ({ text, source: "profile_edit" })),
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

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        dir="auto"
      />
    </label>
  );
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
  primaryLabel = "Primary",
  setPrimaryLabel = "Set primary",
  onRemove,
  removeLabel = "Remove image",
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
          aria-label={removeLabel}
          title={removeLabel}
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
          {isPrimary ? primaryLabel : setPrimaryLabel}
        </button>
      )}
    </div>
  );
}
