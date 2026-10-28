// App-level store for the live learning-time counter. The tracker (mounted in
// the persistent student layout) updates it every active second across ALL
// pages; the dashboard card just subscribes to it. Lives at module scope so it
// survives page navigation — the counter never resets when you change pages.

let value = { today: 0, week: 0, total: 0, days: [], todayDate: "" };
const listeners = new Set();

export function getStudy() {
  return value;
}

export function setStudy(patch) {
  value = { ...value, ...patch };
  listeners.forEach((l) => { try { l(value); } catch { /* noop */ } });
}

export function subscribeStudy(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
