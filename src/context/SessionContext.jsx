"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, clearToken, onAuthChange } from "@/lib/api";

const SessionContext = createContext(null);

// Provides the logged-in user for the student/admin portals by verifying the
// token against /api/auth/check. Re-checks whenever the token changes.
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    return apiFetch("/api/auth/check", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setUser(data.authenticated ? data.user : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    return onAuthChange(refresh);
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
