// Course access expires one year after the student enrols/purchases.
export const ENROLLMENT_DAYS = 365;
const YEAR_MS = ENROLLMENT_DAYS * 24 * 60 * 60 * 1000;

export function oneYearFromNow() {
  return new Date(Date.now() + YEAR_MS);
}

// Expiry for a new enrollment: the course's own endDate when the admin set one,
// otherwise one year from now (the default).
export function courseEndExpiry(course) {
  const end = course && course.endDate;
  if (end) { const d = new Date(end); if (!isNaN(d.getTime())) return d; }
  return oneYearFromNow();
}

// Effective expiry for an enrollment. Uses the stored expiresAt when present,
// otherwise falls back to createdAt + 1 year (covers older records that were
// created before expiry existed).
export function enrollmentExpiry(e) {
  if (!e) return new Date(0);
  if (e.expiresAt) return new Date(e.expiresAt);
  const created = e.createdAt ? new Date(e.createdAt) : new Date();
  return new Date(created.getTime() + YEAR_MS);
}

export function isEnrollmentActive(e, now = Date.now()) {
  return enrollmentExpiry(e).getTime() > now;
}
