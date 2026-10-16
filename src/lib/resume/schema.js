// ResumeData shape, defaults, and a dependency-light sanitizer.
//
// We don't use zod (the repo convention is plain `clean*()` helpers). cleanResumeData()
// is the single source of truth, shared by the client (before autosave) and the
// server (before persisting) — it guarantees a well-formed, bounded object.
import { getDiscipline, DISCIPLINE_IDS, SECTION_KEYS } from "./disciplines.js";

export const SCHEMA_VERSION = 1;
export const TEMPLATE_IDS = ["minimal", "editorial", "grid_portfolio", "classic"];
export const DEFAULT_TEMPLATE = "minimal";

// Limited, always-legible accent palette (any template).
export const ACCENT_COLORS = ["#db254f", "#1f2937", "#0f766e", "#4338ca", "#b45309", "#9d174d"];
export const DEFAULT_ACCENT = "#db254f";

export const AVAILABILITY = ["INTERNSHIP", "FULL_TIME", "FREELANCE", "APPRENTICESHIP"];
export const PROJECT_TYPES = ["Academic", "Client", "Personal", "Competition", "Internship"];
export const EMPLOYMENT_TYPES = ["Internship", "Full-time", "Part-time", "Freelance", "Apprenticeship"];
export const STUDY_TYPES = ["Certificate", "Diploma", "Advanced Diploma", "B.Des", "M.Des", "B.Voc", "Other"];
export const SOFTWARE_LEVELS = ["Beginner", "Intermediate", "Advanced"];
export const FLUENCY = ["Basic", "Conversational", "Fluent", "Native"];
export const SCORE_SYSTEMS = ["CGPA_10", "PERCENTAGE", "GRADE"];

// Caps keep documents small + the preview to ~2 pages.
const CAP = { projects: 20, experience: 20, education: 10, skills: 12, software: 30, items: 30, achievements: 25, profiles: 10, interests: 30, languages: 12, bullets: 12, str: 4000 };

// ── primitives ──
const genId = () => "x" + Math.random().toString(36).slice(2, 10);
const str = (v, max = 400) => (v == null ? "" : String(v)).slice(0, CAP.str).trim().slice(0, max);
const strArr = (v, max = CAP.items, each = 120) => (Array.isArray(v) ? v : []).map((x) => str(x, each)).filter(Boolean).slice(0, max);
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const boolean = (v) => v === true || v === "true";

export const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || "").trim());
export const normalizePhone = (p) => (p || "").replace(/[^\d+]/g, "").slice(0, 15);
// Indian mobile: 10 digits (optionally +91).
export const isValidPhoneIN = (p) => /^(\+?91)?[6-9]\d{9}$/.test(normalizePhone(p));
export const isValidUrl = (u) => { try { const x = new URL((u || "").trim()); return x.protocol === "http:" || x.protocol === "https:"; } catch { return false; } };

// Dedupe case-insensitively, keep first spelling.
export function dedupe(list = []) {
  const seen = new Set(); const out = [];
  for (const raw of list) { const v = str(raw, 120); const k = v.toLowerCase(); if (v && !seen.has(k)) { seen.add(k); out.push(v); } }
  return out;
}

// ── blank / starter data ──
export function blankResumeData(disciplineId = "interior_design", prefill = {}) {
  const d = getDiscipline(disciplineId);
  return cleanResumeData({
    schemaVersion: SCHEMA_VERSION,
    discipline: d.id,
    template: d.defaultTemplate,
    accentColor: DEFAULT_ACCENT,
    targetRole: d.suggestedRoleTitles[0] || "",
    sectionOrder: d.recommendedSections.filter((s) => SECTION_KEYS.includes(s)),
    hiddenSections: SECTION_KEYS.filter((s) => !d.recommendedSections.includes(s)),
    basics: {
      name: prefill.name || "", headline: "", email: prefill.email || "", phone: prefill.phone || "",
      summary: "", location: { city: "", state: "", country: "India" }, profiles: [], availability: "INTERNSHIP",
    },
    education: prefill.education || [],
    projects: [], experience: [], skills: [], software: [],
    certifications: [], awards: [], exhibitions: [], workshops: [], languages: [], interests: [],
  });
}

// ── the sanitizer (never throws; always returns a valid ResumeData) ──
export function cleanResumeData(input = {}) {
  const b = input.basics || {};
  const loc = b.location || {};
  const discipline = oneOf(input.discipline, DISCIPLINE_IDS, "interior_design");

  const sectionOrder = (Array.isArray(input.sectionOrder) ? input.sectionOrder : []).filter((s) => SECTION_KEYS.includes(s));
  // Any known section missing from order goes to the end (so new sections appear).
  for (const s of SECTION_KEYS) if (!sectionOrder.includes(s)) sectionOrder.push(s);
  const hiddenSections = (Array.isArray(input.hiddenSections) ? input.hiddenSections : []).filter((s) => SECTION_KEYS.includes(s));

  return {
    schemaVersion: SCHEMA_VERSION,
    discipline,
    template: oneOf(input.template, TEMPLATE_IDS, DEFAULT_TEMPLATE),
    accentColor: ACCENT_COLORS.includes(input.accentColor) ? input.accentColor : DEFAULT_ACCENT,
    targetRole: str(input.targetRole, 120),
    sectionOrder,
    hiddenSections,

    basics: {
      name: str(b.name, 120),
      headline: str(b.headline, 160),
      email: str(b.email, 160),
      phone: normalizePhone(b.phone),
      photoUrl: str(b.photoUrl, 1000),
      summary: str(b.summary, 1200),
      location: { city: str(loc.city, 80), state: str(loc.state, 80), country: str(loc.country, 80) || "India" },
      profiles: (Array.isArray(b.profiles) ? b.profiles : []).slice(0, CAP.profiles).map((p) => ({ network: str(p?.network, 40), url: str(p?.url, 1000) })).filter((p) => p.network || p.url),
      portfolioUrl: str(b.portfolioUrl, 1000),
      availability: oneOf(b.availability, AVAILABILITY, "INTERNSHIP"),
      willingToRelocate: boolean(b.willingToRelocate),
    },

    education: (Array.isArray(input.education) ? input.education : []).slice(0, CAP.education).map((e) => ({
      id: str(e?.id) || genId(),
      institution: str(e?.institution, 160),
      program: str(e?.program, 160),
      studyType: oneOf(e?.studyType, STUDY_TYPES, "Diploma"),
      startDate: str(e?.startDate, 7),
      endDate: str(e?.endDate, 7),
      score: e?.score ? { system: oneOf(e.score.system, SCORE_SYSTEMS, "PERCENTAGE"), value: str(e.score.value, 20) } : undefined,
      highlights: strArr(e?.highlights, CAP.bullets, 300),
    })),

    projects: (Array.isArray(input.projects) ? input.projects : []).slice(0, CAP.projects).map((p) => ({
      id: str(p?.id) || genId(),
      title: str(p?.title, 160),
      type: oneOf(p?.type, PROJECT_TYPES, "Academic"),
      role: str(p?.role, 120),
      date: str(p?.date, 20),
      coverImageUrl: str(p?.coverImageUrl, 1000),
      tools: dedupe(p?.tools).slice(0, CAP.items),
      brief: str(p?.brief, 600),
      highlights: strArr(p?.highlights, CAP.bullets, 300),
      link: str(p?.link, 1000),
    })),

    experience: (Array.isArray(input.experience) ? input.experience : []).slice(0, CAP.experience).map((x) => ({
      id: str(x?.id) || genId(),
      organization: str(x?.organization, 160),
      position: str(x?.position, 120),
      employmentType: oneOf(x?.employmentType, EMPLOYMENT_TYPES, "Internship"),
      location: str(x?.location, 120),
      startDate: str(x?.startDate, 7),
      endDate: str(x?.endDate, 7),
      highlights: strArr(x?.highlights, CAP.bullets, 300),
    })),

    skills: (Array.isArray(input.skills) ? input.skills : []).slice(0, CAP.skills).map((s) => ({
      id: str(s?.id) || genId(),
      category: str(s?.category, 80),
      items: dedupe(s?.items).slice(0, CAP.items),
    })).filter((s) => s.category || s.items.length),

    software: (Array.isArray(input.software) ? input.software : []).slice(0, CAP.software).map((s) => ({
      name: str(s?.name, 80),
      level: s?.level ? oneOf(s.level, SOFTWARE_LEVELS, "Intermediate") : "",
    })).filter((s) => s.name),

    certifications: (Array.isArray(input.certifications) ? input.certifications : []).slice(0, CAP.achievements).map((c) => ({ id: str(c?.id) || genId(), name: str(c?.name, 160), issuer: str(c?.issuer, 160), date: str(c?.date, 20), url: str(c?.url, 1000) })).filter((c) => c.name),
    awards: (Array.isArray(input.awards) ? input.awards : []).slice(0, CAP.achievements).map((a) => ({ id: str(a?.id) || genId(), title: str(a?.title, 160), awarder: str(a?.awarder, 160), date: str(a?.date, 20), summary: str(a?.summary, 300) })).filter((a) => a.title),
    exhibitions: (Array.isArray(input.exhibitions) ? input.exhibitions : []).slice(0, CAP.achievements).map((e) => ({ id: str(e?.id) || genId(), title: str(e?.title, 160), venue: str(e?.venue, 160), date: str(e?.date, 20), summary: str(e?.summary, 300) })).filter((e) => e.title),
    workshops: (Array.isArray(input.workshops) ? input.workshops : []).slice(0, CAP.achievements).map((w) => ({ id: str(w?.id) || genId(), title: str(w?.title, 160), organizer: str(w?.organizer, 160), date: str(w?.date, 20) })).filter((w) => w.title),
    languages: (Array.isArray(input.languages) ? input.languages : []).slice(0, CAP.languages).map((l) => ({ language: str(l?.language, 60), fluency: oneOf(l?.fluency, FLUENCY, "Conversational") })).filter((l) => l.language),
    interests: dedupe(input.interests).slice(0, CAP.interests),
  };
}

// Flat mirror fields kept on the Resume doc for the admin list + back-compat
// with the original schema (name/title/email/phone/…).
export function deriveFlatMirror(data) {
  const b = data.basics || {};
  const loc = b.location || {};
  return {
    name: b.name || "",
    title: b.headline || data.targetRole || "",
    email: b.email || "",
    phone: b.phone || "",
    location: [loc.city, loc.state, loc.country].filter(Boolean).join(", "),
    website: b.portfolioUrl || (b.profiles?.[0]?.url) || "",
    summary: b.summary || "",
    education: (data.education || []).map((e) => ({ school: e.institution, degree: e.program, year: [e.startDate, e.endDate || "Present"].filter(Boolean).join(" – ") })),
    experience: (data.experience || []).map((x) => ({ company: x.organization, role: x.position, period: [x.startDate, x.endDate || "Present"].filter(Boolean).join(" – "), details: (x.highlights || []).join(" • ") })),
    skills: [...(data.skills || []).flatMap((s) => s.items), ...(data.software || []).map((s) => s.name)].join(", "),
  };
}

// Build a ResumeData from the ORIGINAL flat schema (so resumes saved before the
// redesign open in the new builder without losing data).
export function legacyToData(doc = {}, disciplineId = "custom") {
  return cleanResumeData({
    discipline: disciplineId,
    basics: {
      name: doc.name || "", headline: doc.title || "", email: doc.email || "", phone: doc.phone || "",
      summary: doc.summary || "", portfolioUrl: doc.website || "",
      location: { city: (doc.location || "").split(",")[0]?.trim() || "", state: "", country: "India" },
    },
    education: (doc.education || []).map((e) => ({ institution: e.school || "", program: e.degree || "", startDate: "", endDate: "", studyType: "Diploma" })),
    experience: (doc.experience || []).map((x) => ({ organization: x.company || "", position: x.role || "", employmentType: "Internship", highlights: x.details ? [x.details] : [] })),
    skills: doc.skills ? [{ category: "Skills", items: String(doc.skills).split(",").map((s) => s.trim()).filter(Boolean) }] : [],
  });
}

export { genId };
