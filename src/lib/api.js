// Central client-side API helper.
//
// Auth uses a JWT bearer token kept in localStorage (mirrored into a cookie so
// server-side middleware can read it). Admin and student sessions are stored
// SEPARATELY so both can be logged in at the same time in one browser:
//   /admin/*   → admin token
//   everything else (website + /student/*) → student token

import { emitToast } from "@/lib/toastBus";

export const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) || "";

// Methods that change data → worth a toast. Utility/auth endpoints are skipped
// (signing, parsing, login/logout/signup have their own flows / redirects).
const MUTATIONS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const TOAST_SKIP = /\/(login|logout|signup)\b|\/cloudinary\/sign|\/interview\/sign|\/resume\/parse/;

// Show an automatic success/error toast for admin save/update/delete calls.
// Runs only on /admin pages, only for mutating methods, and never throws.
// Callers can opt out with { toast: false } or override with { toastMessage }.
function autoToast(path, options, reqPromise) {
  try {
    if (typeof window === "undefined") return;
    if (options.toast === false) return;
    const method = (options.method || "GET").toUpperCase();
    if (!MUTATIONS.has(method)) return;
    if (!window.location.pathname.startsWith("/admin")) return;
    if (TOAST_SKIP.test(path)) return;

    reqPromise
      .then(async (res) => {
        let body = {};
        try { body = await res.clone().json(); } catch { /* non-JSON response */ }
        if (res.ok) {
          const msg =
            options.toastMessage ||
            (method === "DELETE" ? "Deleted successfully"
              : method === "POST" ? "Saved successfully"
              : "Updated successfully");
          emitToast({ type: "success", message: msg });
        } else {
          emitToast({ type: "error", message: body.error || body.message || "Action failed. Please try again." });
        }
      })
      .catch(() => emitToast({ type: "error", message: "Network error. Please try again." }));
  } catch { /* toasting must never break a request */ }
}

const AUTH_EVENT = "nuvosid-auth-changed";
// Same name is used for the localStorage key and the cookie (different stores).
const TOKEN_KEYS = { admin: "nuvosid_token_admin", student: "nuvosid_token_student" };

// Which session applies to the current area.
function currentScope() {
  if (typeof window === "undefined") return "student";
  return window.location.pathname.startsWith("/admin") ? "admin" : "student";
}

export function getToken(scope = currentScope()) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEYS[scope]);
  } catch {
    return null;
  }
}

function setCookie(scope, token) {
  if (typeof document === "undefined") return;
  const name = TOKEN_KEYS[scope];
  if (token) {
    document.cookie = `${name}=${token}; path=/; max-age=86400; samesite=lax`;
  } else {
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  }
}

export function setToken(token, scope = currentScope()) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEYS[scope], token);
    else localStorage.removeItem(TOKEN_KEYS[scope]);
    setCookie(scope, token);
    // Notify listeners (Navbar, FixedCTA, session context, …) that auth changed.
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}

export function clearToken(scope = currentScope()) {
  setToken(null, scope);
}

// Subscribe to auth changes; returns an unsubscribe function.
export function onAuthChange(handler) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, handler);
  return () => window.removeEventListener(AUTH_EVENT, handler);
}

// fetch wrapper that attaches the bearer token for the CURRENT area and, when
// no external API_BASE is set, adds a trailing slash (trailingSlash: true).
export function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let url = `${API_BASE}${path}`;
  if (!API_BASE) {
    const [p, query] = path.split("?");
    const normalized = p.endsWith("/") ? p : `${p}/`;
    url = query ? `${normalized}?${query}` : normalized;
  }

  const req = fetch(url, { ...options, headers });
  autoToast(path, options, req);
  return req;
}
