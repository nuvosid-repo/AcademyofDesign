"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, clearToken, getToken, onAuthChange } from "@/lib/api";

const SessionContext = createContext(null);

// Provides the logged-in user for the student/admin portals by verifying the
// token against /api/auth/check. Re-checks whenever the token changes.
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // `silent` background checks never toggle `loading`, so periodic re-validation
  // doesn't flash the portal's loading screen (which would remount the page).
  const refresh = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return apiFetch("/api/auth/check", { cache: "no-store" })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.authenticated) { setUser(data.user); return; }
        // Definitive server rejection (expired, invalid, or superseded by a
        // login on another device) → drop the dead token and log out.
        setUser(null);
        try { if (getToken()) clearToken(); } catch { /* noop */ }
      })
      .catch(() => { if (!silent) setUser(null); }) // transient error on a silent check: keep the session
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => {
    refresh();                                   // initial: shows the loading state
    const off = onAuthChange(() => refresh(true)); // token change: silent
    // Re-validate periodically (single active session) — silent, no flicker.
    const iv = setInterval(() => { if (getToken()) refresh(true); }, 45_000);
    return () => { off(); clearInterval(iv); };
  }, [refresh]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
