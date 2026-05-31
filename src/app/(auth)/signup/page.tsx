"use client";
import type { ElementType } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandMark } from "@/components/BrandMark";
import { useLanguage, useT } from "@/lib/i18n/LanguageContext";
import { ArrowLeft, ArrowRight, Building2, Megaphone, UserRound } from "lucide-react";

type SignupStep = "account" | "type";
type AccountType = "business" | "creator" | "agency";

const ACCOUNT_TYPES: {
  id: AccountType;
  titleKey: string;
  descKey: string;
  icon: ElementType;
  accent: string;
}[] = [
  {
    id: "business",
    titleKey: "auth.accountTypeBusiness",
    descKey: "auth.accountTypeBusinessDesc",
    icon: Building2,
    accent: "bg-[#f8d84a] text-black",
  },
  {
    id: "creator",
    titleKey: "auth.accountTypeCreator",
    descKey: "auth.accountTypeCreatorDesc",
    icon: UserRound,
    accent: "bg-[#2f80ff] text-white",
  },
  {
    id: "agency",
    titleKey: "auth.accountTypeAgency",
    descKey: "auth.accountTypeAgencyDesc",
    icon: Megaphone,
    accent: "bg-[#ff4fa3] text-white",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const t = useT();
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const ArrowBack = isRtl ? ArrowRight : ArrowLeft;
  const ArrowNext = isRtl ? ArrowLeft : ArrowRight;
  const [step, setStep] = useState<SignupStep>("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedType, setSelectedType] = useState<AccountType>("business");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("type");
  }

  async function createAccount(accountType: AccountType) {
    setError("");
    setLoading(true);
    try {
      const res = await api.auth.signup({ email, password, full_name: name });
      localStorage.setItem("co_suite_account_type", accountType);
      setAuth(res.access_token, res.user);
      router.push("/suite/new");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border bg-card text-card-foreground shadow-xl">
      <CardHeader className="space-y-1">
        <div className="mb-2"><BrandMark size="lg" /></div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={step === "account" ? "text-foreground" : ""}>{t("auth.signupStepAccount")}</span>
          <span className="h-px flex-1 bg-border" />
          <span className={step === "type" ? "text-foreground" : ""}>{t("auth.signupStepType")}</span>
        </div>
        <CardTitle className="text-xl">{step === "account" ? t("auth.signUp") : t("auth.accountTypeTitle")}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {step === "account" ? t("auth.signUpSubtitle") : t("auth.accountTypeSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "account" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.fullName")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("auth.namePlaceholder")}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="bg-background"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2">
              {t("auth.continue")} <ArrowNext size={16} />
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            {ACCOUNT_TYPES.map((type) => {
              const Icon = type.icon;
              const active = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedType(type.id)}
                  className={`w-full rounded-xl border p-3 text-start transition ${
                    active ? "border-foreground bg-muted" : "border-border hover:border-foreground/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${type.accent}`}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{t(type.titleKey)}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{t(type.descKey)}</span>
                    </span>
                  </div>
                </button>
              );
            })}
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setStep("account")} className="gap-2">
                <ArrowBack size={16} /> {t("auth.back")}
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => createAccount(selectedType)}
                className="flex-1 bg-foreground text-background hover:bg-foreground/90"
              >
                {loading ? t("auth.creating") : t("auth.signUp")}
              </Button>
            </div>
          </div>
        )}
        <p className="text-center text-sm text-zinc-500 mt-4">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-[#2f80ff] hover:underline">
            {t("auth.signInLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
