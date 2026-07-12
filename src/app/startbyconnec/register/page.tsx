"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/LanguageContext";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function FunnelRegisterPage() {
  const t = useT();
  const router = useRouter();
  const { user, setAuth, setUser } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await api.funnel.register({ email, password, full_name: name, phone });
      setAuth(res.access_token, res.user);
      router.push("/suite/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function continueExisting() {
    setBusy(true); setError("");
    try {
      // logged-in users without a stored phone must provide one (backend 400s otherwise)
      const res = await api.funnel.enroll(phone.trim() ? { phone: phone.trim() } : undefined);
      setUser(res.user);
      router.push("/suite/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2";
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6 text-center">{t("sbc.register.title")}</h1>
      {user ? (
        <Button onClick={continueExisting} disabled={busy} className="w-full mb-4">
          {t("sbc.register.continue")}
        </Button>
      ) : null}
      <form onSubmit={submit} className="space-y-3">
        <input className={inputCls} name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.fullName")} required />
        <input className={inputCls} type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} required />
        <input className={inputCls} type="tel" name="phone" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("sbc.register.phone")} required minLength={6} />
        <input className={inputCls} type="password" name="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} required minLength={6} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">{t("sbc.register.submit")}</Button>
      </form>
    </div>
  );
}
