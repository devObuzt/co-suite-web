"use client";
import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, Suite } from "@/lib/api";
import { LANGUAGES } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit2 } from "lucide-react";

export default function BusinessProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [suite, setSuite] = useState<Suite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.suites.get(id).then(setSuite).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-zinc-400 text-sm">Loading…</div>;
  }
  if (!suite) {
    return <div className="p-8 text-zinc-400 text-sm">Suite not found.</div>;
  }

  const brand = suite.brand ?? undefined;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{suite.name}</h1>
            <p className="text-zinc-500 text-xs mt-0.5">Business Profile</p>
          </div>
        </div>
        <Link href="/suite/new">
          <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 gap-1.5">
            <Edit2 size={12} /> Edit in wizard
          </Button>
        </Link>
      </div>

      {/* A: Business Name */}
      {brand?.name && (
        <ProfileSection title="Business name">
          <p className="text-white text-sm font-medium" dir="auto">{brand.name}</p>
        </ProfileSection>
      )}

      {/* B: Category */}
      {(brand?.niche || brand?.industry) && (
        <ProfileSection title="Category">
          <Badge variant="outline" className="border-zinc-600 text-zinc-300">{brand.niche || brand.industry}</Badge>
        </ProfileSection>
      )}

      {/* C: Languages */}
      {(brand?.audience_languages || []).length > 0 && (
        <ProfileSection title="Audience languages">
          <div className="flex flex-wrap gap-2">
            {(brand?.audience_languages || []).map((code, idx) => {
              const lang = LANGUAGES.find((l) => l.code === code);
              return (
                <span key={code} dir={lang?.dir}
                  className={`text-sm px-2.5 py-1 rounded-full border ${idx === 0 ? "bg-indigo-950 border-indigo-700 text-indigo-300" : "border-zinc-700 text-zinc-400"}`}>
                  {lang?.label || code}
                  {idx === 0 && <span className="ml-1 text-indigo-500 text-xs">•</span>}
                </span>
              );
            })}
          </div>
        </ProfileSection>
      )}

      {/* D: Services */}
      {(brand?.services || []).length > 0 && (
        <ProfileSection title="Products & Services">
          <div className="flex flex-wrap gap-1.5">
            {(brand?.services || []).map((s) => (
              <Badge key={s} variant="outline" className="border-zinc-700 text-zinc-300 text-xs" dir="auto">{s}</Badge>
            ))}
          </div>
        </ProfileSection>
      )}

      {/* E: Audience */}
      {(brand?.audience_location || brand?.audience_interests) && (
        <ProfileSection title="Target audience">
          {brand?.audience_location && (
            <div className="mb-2">
              <p className="text-zinc-500 text-xs mb-1">Location</p>
              <p className="text-zinc-300 text-sm">
                {brand.audience_location.scope === "world"
                  ? "Worldwide"
                  : [...(brand.audience_location.countries || []), ...(brand.audience_location.cities || [])].join(", ") || "—"}
              </p>
            </div>
          )}
          {(brand?.audience_interests || []).length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs mb-1">Interests</p>
              <div className="flex flex-wrap gap-1">
                {(brand.audience_interests || []).map((i) => (
                  <span key={i} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700" dir="auto">{i}</span>
                ))}
              </div>
            </div>
          )}
        </ProfileSection>
      )}

      {/* F: USP / ESP */}
      {((brand?.usp_points || []).length > 0 || (brand?.esp_points || []).length > 0) && (
        <ProfileSection title="Why choose us">
          {(brand?.usp_points || []).length > 0 && (
            <div className="mb-3">
              <p className="text-zinc-500 text-xs mb-1.5">Advantages (USP)</p>
              <ul className="space-y-1">
                {(brand?.usp_points || []).map((p) => (
                  <li key={p} className="text-white text-sm flex items-start gap-1.5" dir="auto">
                    <span className="text-indigo-400 mt-0.5 shrink-0">·</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(brand?.esp_points || []).length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs mb-1.5">Client feels (ESP)</p>
              <ul className="space-y-1">
                {(brand?.esp_points || []).map((p) => (
                  <li key={p} className="text-white text-sm flex items-start gap-1.5" dir="auto">
                    <span className="text-indigo-400 mt-0.5 shrink-0">·</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ProfileSection>
      )}

      {/* G: Brand */}
      {(brand?.logo_url || brand?.colors?.primary || (brand?.font_suggestions || []).length > 0) && (
        <ProfileSection title="Brand">
          <div className="flex items-center gap-4 flex-wrap">
            {brand?.logo_url && (
              <img src={brand.logo_url} alt="logo" className="h-16 w-16 object-contain bg-zinc-800 rounded-xl border border-zinc-700 p-2" />
            )}
            {brand?.colors?.primary && (
              <div className="flex gap-2">
                {(["primary", "secondary", "accent"] as const).map((k) => brand?.colors?.[k] && (
                  <div key={k} className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded border border-zinc-700" style={{ backgroundColor: brand?.colors?.[k] as string }} />
                    <span className="text-xs text-zinc-500 font-mono">{brand?.colors?.[k]}</span>
                  </div>
                ))}
              </div>
            )}
            {(brand?.font_suggestions || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(brand?.font_suggestions || []).map((f) => (
                  <span key={f} className="text-sm bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded border border-zinc-700">{f}</span>
                ))}
              </div>
            )}
          </div>
        </ProfileSection>
      )}
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 text-white">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs text-zinc-500 font-normal uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
}
