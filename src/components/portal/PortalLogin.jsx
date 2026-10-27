"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiFetch, setToken } from "@/lib/api";

// Reusable login card for the portals.
//  - requiredRole: if set, only that role may log in here (e.g. "admin").
//  - redirectTo:   where to go on success.
//  - variant:      "dark" (student) or "light" (admin).
export default function PortalLogin({ brand, requiredRole, redirectTo, hint, variant = "dark" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const light = variant === "light";

  // Show a notice when redirected here after an idle-timeout session expiry.
  useEffect(() => {
    try { if (new URLSearchParams(window.location.search).get("expired")) setExpired(true); } catch { /* noop */ }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(requiredRole ? { requiredRole } : {}) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Login failed");
        return;
      }
      if (requiredRole && data.user?.role !== requiredRole) {
        setError(`This account is not an ${requiredRole}.`);
        return;
      }
      setToken(data.token);
      router.replace(redirectTo);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const t = light
    ? {
        page: "bg-gray-50 text-gray-800",
        brand: "text-gray-900",
        accent: "text-[#db254f]",
        card: "bg-white border-gray-200 shadow-sm",
        heading: "text-gray-900",
        sub: "text-gray-500",
        label: "text-gray-500",
        input: "bg-gray-50 border-gray-200 text-gray-800 focus:border-[#db254f] focus:bg-white",
        button: "bg-[#db254f] hover:bg-[#b91d40]",
        error: "text-rose-600 bg-rose-50 border-rose-200",
        hint: "text-gray-400",
      }
    : {
        page: "bg-neutral-950 text-neutral-100",
        brand: "text-white",
        accent: "text-rose-400",
        card: "bg-neutral-900/70 border-white/10",
        heading: "text-white",
        sub: "text-neutral-400",
        label: "text-neutral-400",
        input: "bg-white/5 border-white/10 text-white focus:border-rose-500/50 focus:bg-white/10",
        button: "bg-gradient-to-r from-rose-600 to-rose-500 hover:opacity-95",
        error: "text-rose-300 bg-rose-500/10 border-rose-500/30",
        hint: "text-neutral-500",
      };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${t.page}`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src={light ? "/assets/logo_black.png" : "/assets/logo.png"}
              alt="Nuvosid"
              width={180}
              height={44}
              unoptimized
              className="h-10 w-auto object-contain mx-auto"
              priority
            />
          </Link>
          <p className={`text-xs uppercase tracking-[0.2em] mt-3 ${t.accent}`}>{brand}</p>
        </div>

        <form onSubmit={submit} className={`border rounded-2xl p-6 md:p-8 space-y-5 ${t.card}`}>
          <div>
            <h1 className={`text-xl font-bold ${t.heading}`}>Sign in</h1>
            <p className={`text-sm mt-1 ${t.sub}`}>Welcome back. Enter your details.</p>
          </div>

          {expired && !error && (
            <div className="text-sm border rounded-lg px-3 py-2 border-amber-400/40 text-amber-500" style={{ background: "rgba(245,158,11,0.1)" }}>
              Your session expired due to inactivity. Please sign in again.
            </div>
          )}
          {error && <div className={`text-sm border rounded-lg px-3 py-2 ${t.error}`}>{error}</div>}

          <div className="space-y-1.5">
            <label className={`text-xs font-semibold uppercase tracking-wide ${t.label}`}>Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${t.input}`}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs font-semibold uppercase tracking-wide ${t.label}`}>Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${t.input}`}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className={`w-full rounded-full btn-pill py-3 font-semibold text-sm text-white disabled:opacity-60 transition ${t.button}`}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          {hint && <p className={`text-xs text-center ${t.hint}`}>{hint}</p>}
        </form>
      </div>
    </div>
  );
}
