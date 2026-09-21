"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { manzumaSession } from "@/lib/manzumaSession";
import { useAuthStore } from "@/store/auth";

/**
 * One place where the shared Manzuma session becomes this app's user.
 *
 * Without it every screen has to decide for itself what "signed in" means, and
 * they disagreed: the API already recognised the person (the cookie travels
 * now), while the landing page still offered them a login button and the
 * dashboard bounced them to /login.
 *
 * Runs once, only when there is no local token to go on, and stays silent when
 * there is no session — a visitor is still a visitor.
 */
export function ManzumaSessionBootstrap() {
  const { token, user, _hasHydrated, setUser } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated || token || user) return;

    let cancelled = false;
    (async () => {
      const session = await manzumaSession();
      if (cancelled || !session) return;
      try {
        // The API reads the same cookie; this is both the proof and the account.
        const me = await api.auth.me();
        if (!cancelled) setUser(me);
      } catch {
        // No account behind the session yet. The screens keep treating this as
        // a visitor rather than showing a half-signed-in state.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [_hasHydrated, token, user, setUser]);

  return null;
}
