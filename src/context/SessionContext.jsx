"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, clearToken, getToken, onAuthChange } from "@/lib/api";

const SessionContext = createContext(null);

// Provides the logged-in user for the student/admin portals by verifying the
// token against /api/auth/check. Re-checks whenever the token changes.
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    return apiFetch("/api/auth/check", { cache: "no-store" })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.authenticated) { setUser(data.user); return; }
        // Definitive server rejection (expired, invalid, or superseded by a
        // login on another device) → drop the dead token and log out.
        setUser(null);
        try { if (getToken()) clearToken(); } catch { /* noop */ }
      })
      .catch(() => setUser(null)) // transient/network error: keep the token
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const off = onAuthChange(refresh);
    // Re-validate periodically so a session superseded by a login elsewhere is
    // logged out promptly (single active session).
    const iv = setInterval(() => { if (getToken()) refresh(); }, 45_000);
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
