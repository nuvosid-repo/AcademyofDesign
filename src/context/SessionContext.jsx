"use client";
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { apiFetch, clearToken, getToken, onAuthChange } from "@/lib/api";

const SessionContext = createContext(null);

// Provides the logged-in user for the student/admin portals by verifying the
// token against /api/auth/check. Re-checks whenever the token changes.
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Mirrors `user` so the auth-change listener (a stable closure) can tell a
  // fresh login (no user yet) from a token rotation / periodic re-check.
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);

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
    // Token changed: when a user is already signed in (token rotation / silent
    // periodic re-check) keep it silent to avoid a flicker; on a FRESH login
    // (no user yet) run a visible check so route guards wait for it to resolve
    // instead of bouncing to the login page before the new user is known.
    const off = onAuthChange(() => refresh(!!userRef.current));
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
