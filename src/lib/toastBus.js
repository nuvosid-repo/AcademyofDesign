// Tiny pub/sub so plain modules (e.g. apiFetch) can raise toast notifications
// that the admin <ToastProvider> renders. It is a no-op when nothing is
// listening, so non-admin areas (which never mount the provider) show nothing.

let listeners = [];
let seq = 0;

export function onToast(cb) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

// Raise a toast. Returns its id. Defaults: success, auto-dismiss ~3.2s.
export function emitToast(toast = {}) {
  const t = { id: ++seq, type: "success", duration: 3200, ...toast };
  listeners.forEach((l) => {
    try { l(t); } catch { /* a bad listener must not break the caller */ }
  });
  return t.id;
}
