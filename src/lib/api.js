// Central client-side API helper.
//
// Auth uses a JWT bearer token kept in localStorage (mirrored into a cookie so
// server-side middleware can read it). Admin and student sessions are stored
// SEPARATELY so both can be logged in at the same time in one browser:
//   /admin/*   → admin token
//   everything else (website + /student/*) → student token

export const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) || "";

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

  return fetch(url, { ...options, headers });
}
