// Shared resume helpers used by the student + admin routes.

const FIELDS = ["name", "title", "email", "phone", "location", "website", "summary", "skills"];

export function cleanResume(b = {}) {
  return {
    name: (b.name || "").toString().trim(),
    title: (b.title || "").toString().trim(),
    email: (b.email || "").toString().trim(),
    phone: (b.phone || "").toString().trim(),
    location: (b.location || "").toString().trim(),
    website: (b.website || "").toString().trim(),
    summary: (b.summary || "").toString().trim(),
    education: Array.isArray(b.education)
      ? b.education.map((e) => ({ school: (e.school || "").toString(), degree: (e.degree || "").toString(), year: (e.year || "").toString() }))
      : [],
    experience: Array.isArray(b.experience)
      ? b.experience.map((e) => ({ company: (e.company || "").toString(), role: (e.role || "").toString(), period: (e.period || "").toString(), details: (e.details || "").toString() }))
      : [],
    skills: (b.skills || "").toString().trim(),
  };
}

// A resume is "complete" when the core sections are all filled.
export function isResumeComplete(r) {
  if (!r) return false;
  const core = r.name && r.title && r.email && r.phone && r.summary && r.skills;
  const hasEdu = (r.education || []).some((e) => (e.school || "").trim() && (e.degree || "").trim());
  const hasExp = (r.experience || []).some((e) => (e.company || "").trim() && (e.role || "").trim());
  return !!(core && hasEdu && hasExp);
}

// 0–100 completeness used for the admin progress indicator.
export function resumeCompletion(r) {
  if (!r) return 0;
  let filled = FIELDS.filter((k) => (r[k] || "").toString().trim()).length;
  let total = FIELDS.length + 2; // + education + experience
  if ((r.education || []).some((e) => (e.school || "").trim() && (e.degree || "").trim())) filled++;
  if ((r.experience || []).some((e) => (e.company || "").trim() && (e.role || "").trim())) filled++;
  return Math.round((filled / total) * 100);
}

export function serializeResume(r) {
  return {
    id: (r._id && r._id.toString()) || r.id,
    studentId: r.studentId || "",
    studentName: r.studentName || "",
    studentEmail: r.studentEmail || "",
    name: r.name || "", title: r.title || "", email: r.email || "", phone: r.phone || "",
    location: r.location || "", website: r.website || "", summary: r.summary || "",
    education: r.education || [], experience: r.experience || [], skills: r.skills || "",
    completed: !!r.completed,
    completion: resumeCompletion(r),
    updatedAt: r.updatedAt || r.createdAt || null,
  };
}
