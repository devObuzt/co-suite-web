"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareLock, Phone, UserRound } from "lucide-react";
import { ApiError, FunnelLead, FunnelResumeStep, api } from "@/lib/api";
import { useT } from "@/lib/i18n/LanguageContext";
import { useAuthStore } from "@/store/auth";
import { StickyCta } from "@/components/funnel/StickyCta";

type Screen = "phone" | "code" | "name";

const OTP_ERROR_KEYS = new Set([
  "invalid_code",
  "code_expired",
  "too_many_attempts",
  "otp_not_found",
  "resend_too_soon",
  "invalid_phone",
]);

export default function FunnelRegisterPage() {
  const t = useT();
  const router = useRouter();
  const { user, setAuth, setUser } = useAuthStore();
  const [screen, setScreen] = useState<Screen>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const checkedResume = useRef(false);

  // A returning verified visitor with a live session resumes immediately.
  useEffect(() => {
    if (!user || checkedResume.current) return;
    checkedResume.current = true;
    api.funnel
      .state()
      .then((state) => {
        if (state.lead && state.resume_step && state.resume_step !== "name") {
          routeByStep(state.resume_step, state.lead);
        } else if (state.lead && state.resume_step === "name") {
          setScreen("name");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  function mapError(err: unknown): string {
    if (err instanceof ApiError && typeof err.detail === "string" && OTP_ERROR_KEYS.has(err.detail)) {
      return t(`sbc.otp.err.${err.detail}`);
    }
    return err instanceof Error ? err.message : "Request failed";
  }

  function routeByStep(step: FunnelResumeStep, lead: FunnelLead | null) {
    if (step === "plans" && lead?.suite_id) {
      router.push(`/suite/${lead.suite_id}/marketing-plan`);
    } else if (step === "services") {
      router.push("/startbyconnec/services");
    } else if (step === "done") {
      router.push("/startbyconnec/done");
    } else if (step === "suite" || step === "plans") {
      router.push("/suite/new");
    } else {
      setScreen("name");
    }
  }

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!phone.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.funnel.otpRequest({ phone: phone.trim() });
      setScreen("code");
      setCode("");
      setResendIn(60);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        // An unexpired code is already out there — let the visitor type it.
        setScreen("code");
        setResendIn(60);
      } else {
        setError(mapError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (code.trim().length < 4) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.funnel.otpVerify({ phone: phone.trim(), code: code.trim() });
      setAuth(res.access_token, res.user);
      routeByStep(res.resume_step, res.lead);
    } catch (err) {
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitName(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.funnel.setProfile({ full_name: name.trim() });
      setUser(res.user);
      router.push("/suite/new");
    } catch (err) {
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/30";
  const ctaCls =
    "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--brand-accent)] to-[var(--brand-accent-strong)] px-6 text-base font-bold text-white shadow-lg shadow-[#2f80ff]/25 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      {screen === "phone" && (
        <form onSubmit={requestCode} className="space-y-5">
          <div className="space-y-2 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2f80ff]/10 text-[var(--brand-accent)]">
              <Phone size={22} />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">{t("sbc.phone.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("sbc.phone.subtitle")}</p>
          </div>
          <input
            className={`${inputCls} text-center text-lg font-semibold tracking-wide`}
            type="tel"
            name="phone"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("sbc.register.phone")}
            dir="ltr"
            required
            minLength={6}
            autoFocus
          />
          {error && <p className="text-center text-sm text-red-500" dir="auto">{error}</p>}
          <StickyCta>
            <button type="submit" disabled={busy || !phone.trim()} className={ctaCls}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              {t("sbc.phone.cta")}
            </button>
          </StickyCta>
        </form>
      )}

      {screen === "code" && (
        <form onSubmit={verifyCode} className="space-y-5">
          <div className="space-y-2 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#18b89d]/10 text-[#18b89d]">
              <MessageSquareLock size={22} />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">{t("sbc.otp.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("sbc.otp.subtitle")} <span dir="ltr" className="font-semibold text-foreground">{phone}</span>
            </p>
          </div>
          <input
            className={`${inputCls} text-center text-2xl font-bold tracking-[0.4em]`}
            type="text"
            name="one-time-code"
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            dir="ltr"
            required
            autoFocus
          />
          {error && <p className="text-center text-sm text-red-500" dir="auto">{error}</p>}
          <div className="text-center">
            {resendIn > 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("sbc.otp.resendIn").replace("{s}", String(resendIn))}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => requestCode()}
                disabled={busy}
                className="text-sm font-medium text-[var(--brand-accent)] hover:underline"
              >
                {t("sbc.otp.resend")}
              </button>
            )}
          </div>
          <StickyCta>
            <button type="submit" disabled={busy || code.trim().length < 4} className={ctaCls}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              {t("sbc.otp.cta")}
            </button>
          </StickyCta>
        </form>
      )}

      {screen === "name" && (
        <form onSubmit={submitName} className="space-y-5">
          <div className="space-y-2 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserRound size={22} />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">{t("sbc.name.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("sbc.name.subtitle")}</p>
          </div>
          <input
            className={`${inputCls} text-center text-lg font-semibold`}
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("auth.fullName")}
            dir="auto"
            required
            autoFocus
          />
          {error && <p className="text-center text-sm text-red-500" dir="auto">{error}</p>}
          <StickyCta>
            <button type="submit" disabled={busy || !name.trim()} className={ctaCls}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              {t("sbc.name.cta")}
            </button>
          </StickyCta>
        </form>
      )}
    </div>
  );
}
