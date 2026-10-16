"use client";
import { useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, Download, Save, Check, Loader2, GraduationCap, Briefcase, Sparkles,
  User, FolderOpen, Award, Palette, ChevronUp, ChevronDown, Copy, Search, X, ImagePlus,
  Sofa, Shirt, PenTool, MonitorSmartphone, Box, Clapperboard, Camera, Shapes, ArrowRight,
  FileText, Maximize2, Minimize2, PencilLine, Eye,
} from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { useSession } from "@/context/SessionContext";
import { apiFetch } from "@/lib/api";
import ResumePaper from "@/components/resume/ResumePaper";
import { DISCIPLINES, getDiscipline, allSkills, SECTION_KEYS, SECTION_LABELS, WEAK_OPENERS } from "@/lib/resume/disciplines";
import {
  blankResumeData, cleanResumeData, genId, TEMPLATE_IDS, ACCENT_COLORS,
  PROJECT_TYPES, EMPLOYMENT_TYPES, STUDY_TYPES, SOFTWARE_LEVELS, FLUENCY, AVAILABILITY, SCORE_SYSTEMS,
} from "@/lib/resume/schema";
import { getStarterSample } from "@/lib/resume/samples";

const KEY = "nuvosid_resume_v2";
const DISC_ICONS = { Sofa, Shirt, PenTool, MonitorSmartphone, Box, Clapperboard, Camera, Shapes };
const FIELD = "w-full rounded-xl border pf-border px-3.5 py-2.5 text-sm outline-none bg-transparent focus:border-[#db254f] transition";

const SECTIONS = [
  { key: "basics", label: "Basics", icon: User },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "projects", label: "Projects", icon: FolderOpen },
  { key: "experience", label: "Experience", icon: Briefcase },
  { key: "skills", label: "Skills", icon: Sparkles },
  { key: "achievements", label: "Achievements", icon: Award },
  { key: "design", label: "Design", icon: Palette },
];

const blankEdu = () => ({ id: genId(), institution: "", program: "", studyType: "Diploma", startDate: "", endDate: "", highlights: [] });
const blankProject = () => ({ id: genId(), title: "", type: "Academic", role: "", date: "", coverImageUrl: "", tools: [], brief: "", highlights: [""], link: "" });
const blankExp = () => ({ id: genId(), organization: "", position: "", employmentType: "Internship", location: "", startDate: "", endDate: "", highlights: [""] });
const blankCert = () => ({ id: genId(), name: "", issuer: "", date: "", url: "" });
const blankAward = () => ({ id: genId(), title: "", awarder: "", date: "", summary: "" });
const blankExhibition = () => ({ id: genId(), title: "", venue: "", date: "", summary: "" });
const blankWorkshop = () => ({ id: genId(), title: "", organizer: "", date: "" });
const blankLang = () => ({ language: "", fluency: "Conversational" });

// ── image compression (canvas) ──
function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = fr.result; };
    fr.onerror = reject; fr.readAsDataURL(file);
  });
}
async function compressImage(file, maxW = 1600, quality = 0.82) {
  try {
    const img = await loadImageFile(file);
    const scale = Math.min(1, maxW / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  } catch { return ""; }
}
async function uploadImage(file) {
  const dataUrl = await compressImage(file);
  if (!dataUrl) return "";
  try {
    const sr = await apiFetch("/api/cloudinary/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder: "nuvosid/resumes" }) });
    const sign = await sr.json();
    if (sign?.configured) {
      const blob = await (await fetch(dataUrl)).blob();
      const form = new FormData();
      form.append("file", blob); form.append("api_key", sign.apiKey); form.append("timestamp", sign.timestamp); form.append("signature", sign.signature); form.append("folder", sign.folder);
      const up = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: "POST", body: form });
      const d = await up.json();
      if (d.secure_url) return d.secure_url;
    }
  } catch { /* fall through */ }
  return dataUrl; // fallback: base64 (server offloads on save)
}

// ── preview pane: fits the 794px A4 paper to the panel width (or 100% zoom) ──
// Width AND paper height are tracked with ResizeObservers so the clip box always
// matches the real (scaled) content — nothing below the header gets cut off.
function PreviewPane({ data, zoom = "fit" }) {
  const wrapRef = useRef(null), paperRef = useRef(null);
  const [fitScale, setFitScale] = useState(0.6);
  const [paperH, setPaperH] = useState(1123);
  const scale = zoom === "fit" ? fitScale : Number(zoom);
  useEffect(() => {
    const wrap = wrapRef.current, paper = paperRef.current;
    const roW = new ResizeObserver(() => { if (wrap) setFitScale(Math.min(1, wrap.clientWidth / 794)); });
    const roP = new ResizeObserver(() => { if (paper) setPaperH(paper.offsetHeight); });
    if (wrap) roW.observe(wrap);
    if (paper) roP.observe(paper);
    return () => { roW.disconnect(); roP.disconnect(); };
  }, []);
  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <div style={{ height: paperH * scale, width: zoom === "fit" ? "100%" : 794 * scale, overflow: "hidden" }}>
        <div ref={paperRef} style={{ transformOrigin: "top left", transform: `scale(${scale})`, width: 794 }}>
          <ResumePaper data={data} />
        </div>
      </div>
    </div>
  );
}

// Circular completion indicator.
function CompletionRing({ value, size = 44 }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(var(--fg-rgb),0.12)" strokeWidth="4.5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#db254f" strokeWidth="4.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .4s ease" }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="currentColor">{value}%</text>
    </svg>
  );
}

const STATUS_STYLE = {
  DRAFT: "bg-gray-100 text-gray-500",
  SUBMITTED: "bg-amber-100 text-amber-700",
  CHANGES_REQUESTED: "bg-rose-100 text-rose-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
};
function StatusBadge({ status }) {
  return <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.DRAFT}`}>{(status || "DRAFT").replace("_", " ")}</span>;
}

function Field({ label, hint, children }) {
  return <div><label className="block text-xs pf-muted mb-1.5">{label}{hint && <span className="pf-faint"> · {hint}</span>}</label>{children}</div>;
}

export default function ResumeBuilderPage() {
  const { user } = useSession();
  const [phase, setPhase] = useState("loading"); // loading | onboarding | builder
  const [data, setData] = useState(null);
  const [active, setActive] = useState("basics");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [mobileView, setMobileView] = useState("edit"); // edit | preview
  const [skillQuery, setSkillQuery] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [zoom, setZoom] = useState("fit"); // "fit" | 1
  const loadedRef = useRef(false);
  const printRef = useRef(null);

  /* ── Load ── */
  useEffect(() => {
    apiFetch("/api/student/resume", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.resume?.data) {
          setData(cleanResumeData(d.resume.data)); setStatus(d.resume.status || "DRAFT");
          setPhase("builder"); loadedRef.current = true; return;
        }
        try { const s = localStorage.getItem(KEY); if (s) { setData(cleanResumeData(JSON.parse(s))); setPhase("builder"); loadedRef.current = true; return; } } catch { /* ignore */ }
        setPhase("onboarding");
      })
      .catch(() => {
        try { const s = localStorage.getItem(KEY); if (s) { setData(cleanResumeData(JSON.parse(s))); setPhase("builder"); loadedRef.current = true; return; } } catch { /* ignore */ }
        setPhase("onboarding");
      });
  }, []);

  /* ── Autosave (debounced) + local draft ── */
  useEffect(() => {
    if (!loadedRef.current || !data) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
    const t = setTimeout(() => save(data, true), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const save = async (payload, auto) => {
    setSaving(true); if (!auto) setSavedMsg("");
    try {
      const res = await apiFetch("/api/student/resume", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: payload }) });
      const d = await res.json();
      if (res.ok) { setStatus(d.resume?.status || "DRAFT"); setSavedMsg(auto ? "Saved" : "Saved ✓"); }
      else setSavedMsg(d.error || "Could not save");
    } catch { setSavedMsg("Offline — will retry"); }
    finally { setSaving(false); }
  };

  /* ── immutable updates ── */
  const up = (fn) => setData((d) => { const n = structuredClone(d); fn(n); return n; });
  const setBasics = (k, v) => up((d) => { d.basics[k] = v; });
  const setLoc = (k, v) => up((d) => { d.basics.location[k] = v; });
  const addItem = (key, blank) => up((d) => { d[key] = [...(d[key] || []), blank()]; });
  const rmItem = (key, i) => up((d) => { d[key].splice(i, 1); });
  const dupItem = (key, i) => up((d) => { const copy = { ...structuredClone(d[key][i]), id: genId() }; d[key].splice(i + 1, 0, copy); });
  const moveItem = (key, i, dir) => up((d) => { const j = i + dir; if (j < 0 || j >= d[key].length) return; [d[key][i], d[key][j]] = [d[key][j], d[key][i]]; });
  const setItem = (key, i, patch) => up((d) => { d[key][i] = { ...d[key][i], ...patch }; });
  const addBullet = (key, i) => up((d) => { d[key][i].highlights = [...(d[key][i].highlights || []), ""]; });
  const setBullet = (key, i, bi, v) => up((d) => { d[key][i].highlights[bi] = v; });
  const rmBullet = (key, i, bi) => up((d) => { d[key][i].highlights.splice(bi, 1); });

  const disc = data ? getDiscipline(data.discipline) : null;

  // Per-section completion (for the nav checks + the completion ring).
  const filled = data ? {
    basics: !!(data.basics.name && data.basics.email && data.basics.summary),
    education: data.education.length > 0,
    projects: data.projects.some((p) => p.title),
    experience: data.experience.some((x) => x.position || x.organization),
    skills: data.skills.some((s) => s.items.length) || data.software.length > 0,
    achievements: !!(data.certifications.length || data.awards.length || data.exhibitions.length || data.workshops.length || data.languages.length),
  } : {};
  const CORE = ["basics", "education", "projects", "experience", "skills"];
  const completion = data ? Math.round((CORE.filter((k) => filled[k]).length / CORE.length) * 100) : 0;

  /* ── skills ── */
  const skillSelected = (skill) => (data?.skills || []).some((s) => s.items.some((x) => x.toLowerCase() === skill.toLowerCase()));
  const toggleSkill = (cat, skill) => up((d) => {
    let c = d.skills.find((s) => s.category.toLowerCase() === cat.toLowerCase());
    if (!c) { c = { id: genId(), category: cat, items: [] }; d.skills.push(c); }
    const idx = c.items.findIndex((x) => x.toLowerCase() === skill.toLowerCase());
    if (idx >= 0) { c.items.splice(idx, 1); if (!c.items.length) d.skills = d.skills.filter((s) => s !== c); }
    else c.items.push(skill);
  });
  const addSoftware = () => up((d) => { d.software = [...(d.software || []), { name: "", level: "Intermediate" }]; });
  const setSoftware = (i, patch) => up((d) => { d.software[i] = { ...d.software[i], ...patch }; });
  const rmSoftware = (i) => up((d) => { d.software.splice(i, 1); });

  /* ── tools chip input (projects) ── */
  const addTool = (i, val) => { const v = val.trim(); if (!v) return; up((d) => { if (!d.projects[i].tools.some((t) => t.toLowerCase() === v.toLowerCase())) d.projects[i].tools.push(v); }); };
  const rmTool = (i, ti) => up((d) => { d.projects[i].tools.splice(ti, 1); });

  const pickImage = (onUrl) => async (e) => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setSavedMsg("Uploading image…");
    const url = await uploadImage(file);
    if (url) onUrl(url);
    setSavedMsg("");
  };

  const download = () => {
    const html = printRef.current?.innerHTML || "";
    const w = window.open("", "_blank", "width=860,height=1100");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${data?.basics?.name || "Resume"} — Resume</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0}</style></head><body>${html}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 350);
  };

  /* ── onboarding ── */
  const startWith = (disciplineId) => {
    const d = cleanResumeData(blankResumeData(disciplineId, { name: user?.name || "", email: user?.email || "" }));
    setData(d); setActive("basics"); setPhase("builder"); loadedRef.current = true; save(d, false);
  };
  const loadSample = () => {
    const empty = !(data.basics.name || data.projects.length || data.experience.length);
    if (!empty && !window.confirm("Replace the current resume with a starter sample? This cannot be undone.")) return;
    setData(getStarterSample(data.discipline));
  };

  /* ───────────────── render ───────────────── */
  if (phase === "loading") return <StudentShell subtitle="Resume Builder"><div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#db254f]" size={28} /></div></StudentShell>;

  if (phase === "onboarding") return (
    <StudentShell subtitle="Resume Builder">
      <div className="max-w-2xl mx-auto text-center mb-9">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase text-[#db254f] px-3 py-1 rounded-full mb-4" style={{ background: "rgba(219,37,79,0.1)" }}><Sparkles size={13} /> Portfolio résumé builder</span>
        <h2 className="text-3xl font-extrabold tracking-tight">Build a résumé that shows your work</h2>
        <p className="pf-muted mt-2">Choose your design discipline — the builder tailors its skill bank, sections, templates and a starter sample to it.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {DISCIPLINES.map((d) => {
          const Ic = DISC_ICONS[d.icon] || Shapes;
          const skillCount = d.skillCategories.reduce((n, c) => n + c.skills.length, 0) + d.software.length;
          return (
            <button key={d.id} onClick={() => startWith(d.id)} className="group pf-card p-6 text-left transition duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ borderColor: undefined }}>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shadow-rose-500/20 transition group-hover:scale-105" style={{ background: "linear-gradient(135deg,#db254f,#e56b85)" }}><Ic size={22} /></div>
                <ArrowRight size={18} className="pf-faint transition group-hover:translate-x-1 group-hover:text-[#db254f]" />
              </div>
              <div className="font-bold text-[15px] mt-3.5">{d.label}</div>
              <div className="pf-faint text-xs mt-1 line-clamp-2 min-h-[2rem]">{d.suggestedRoleTitles.slice(0, 3).join(" · ")}</div>
              <div className="pf-faint text-[11px] mt-2.5 pt-2.5 border-t pf-border flex items-center gap-3">
                <span>{skillCount}+ skills</span>
                <span className="capitalize">{d.defaultTemplate.replace("_", " ")} template</span>
              </div>
            </button>
          );
        })}
      </div>
    </StudentShell>
  );

  // ── builder (these RETURN JSX inline — not components — so inputs keep focus) ──
  const actions = (k, i) => (
    <div className="flex items-center gap-1">
      <button onClick={() => moveItem(k, i, -1)} disabled={i === 0} title="Move up" className="w-7 h-7 rounded-lg border pf-border pf-muted hover:text-[#db254f] disabled:opacity-30 flex items-center justify-center"><ChevronUp size={14} /></button>
      <button onClick={() => moveItem(k, i, 1)} disabled={i === data[k].length - 1} title="Move down" className="w-7 h-7 rounded-lg border pf-border pf-muted hover:text-[#db254f] disabled:opacity-30 flex items-center justify-center"><ChevronDown size={14} /></button>
      <button onClick={() => dupItem(k, i)} title="Duplicate" className="w-7 h-7 rounded-lg border pf-border pf-muted hover:text-[#db254f] flex items-center justify-center"><Copy size={13} /></button>
      <button onClick={() => rmItem(k, i)} title="Remove" className="w-7 h-7 rounded-lg border pf-border pf-muted hover:text-rose-500 flex items-center justify-center"><Trash2 size={13} /></button>
    </div>
  );

  const bullets = (k, i) => (
    <div className="mt-2">
      <label className="block text-xs pf-muted mb-1.5">Highlights <span className="pf-faint">· start with a verb, add a number</span></label>
      <div className="space-y-2">
        {(data[k][i].highlights || []).map((h, bi) => {
          const weak = WEAK_OPENERS.some((w) => h.toLowerCase().startsWith(w));
          const hasNum = /\d/.test(h) || (disc.impactSignals || []).some((s) => h.toLowerCase().includes(s.toLowerCase()));
          return (
            <div key={bi} className="flex items-center gap-2">
              <span title={!h.trim() ? "" : weak ? "Weak opener — start with a strong verb" : hasNum ? "Great — quantified" : "Add a number for impact"} className={`text-xs shrink-0 w-4 text-center ${!h.trim() ? "pf-faint" : weak || !hasNum ? "text-amber-500" : "text-emerald-500"}`}>{!h.trim() ? "•" : weak || !hasNum ? "⚠" : "✓"}</span>
              <input className={FIELD} value={h} onChange={(e) => setBullet(k, i, bi, e.target.value)} placeholder="e.g. Designed a layout that added 15% usable area" />
              <button onClick={() => rmBullet(k, i, bi)} className="shrink-0 w-9 h-9 rounded-lg border pf-border pf-muted hover:text-rose-500 flex items-center justify-center"><X size={14} /></button>
            </div>
          );
        })}
      </div>
      <button onClick={() => addBullet(k, i)} className="mt-2 inline-flex items-center gap-1 text-xs text-[#db254f] font-medium hover:underline"><Plus size={13} /> Add highlight</button>
    </div>
  );

  const searchResults = skillQuery.trim()
    ? [...new Set(DISCIPLINES.flatMap((d) => allSkills(d.id)))].filter((s) => s.toLowerCase().includes(skillQuery.trim().toLowerCase()) && !skillSelected(s)).slice(0, 12)
    : [];

  return (
    <StudentShell subtitle="Resume Builder">
      {/* ── Toolbar ── */}
      <div className="pf-card px-4 sm:px-5 py-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <CompletionRing value={completion} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight truncate">{data.basics.name || "Your résumé"}</h2>
            <div className="flex items-center gap-2 mt-1">
              <select value={data.discipline} onChange={(e) => up((d) => { d.discipline = e.target.value; })} className="rounded-full pf-chip pf-muted text-xs font-medium px-2.5 py-1 outline-none cursor-pointer">
                {DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
              <StatusBadge status={status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium inline-flex items-center gap-1.5 pf-faint">
            {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : savedMsg ? <><Check size={13} className="text-emerald-500" /> {savedMsg}</> : null}
          </span>
          <button onClick={() => save(data, false)} disabled={saving} className="inline-flex items-center gap-2 rounded-full border pf-border px-4 py-2.5 text-sm font-semibold pf-hover transition disabled:opacity-60"><Save size={15} className="text-[#db254f]" /> Save</button>
          <button onClick={download} className="inline-flex items-center gap-2 rounded-full bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-4 py-2.5 shadow-sm shadow-rose-500/30 transition"><Download size={15} /> PDF</button>
        </div>
      </div>

      {/* Mobile edit/preview toggle */}
      <div className="lg:hidden flex rounded-full border pf-border p-1 mb-4 text-sm font-semibold w-full max-w-xs mx-auto">
        {[["edit", PencilLine], ["preview", Eye]].map(([v, Ic]) => <button key={v} onClick={() => setMobileView(v)} className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full capitalize transition ${mobileView === v ? "bg-[#db254f] text-white" : "pf-muted"}`}><Ic size={14} /> {v}</button>)}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.14fr)_minmax(0,1fr)] gap-5 items-start">
        {/* ── Form ── */}
        <div className={`min-w-0 ${mobileView === "preview" ? "hidden lg:block" : ""}`}>
          {/* Horizontal section tabs */}
          <div className="pf-card p-1.5 mb-4 flex gap-1 overflow-x-auto no-scrollbar">
            {SECTIONS.map((s) => {
              const on = active === s.key;
              return (
                <button key={s.key} onClick={() => setActive(s.key)} className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${on ? "bg-[#db254f] text-white shadow-sm shadow-rose-500/30" : "pf-muted pf-hover"}`}>
                  <s.icon size={16} className="shrink-0" />
                  <span className="whitespace-nowrap">{s.label}</span>
                  {filled[s.key] && <Check size={13} className={on ? "text-white/90" : "text-emerald-500"} />}
                </button>
              );
            })}
          </div>

          {/* BASICS */}
          {active === "basics" && (
            <div className="pf-card p-6 space-y-4">
              <h3 className="font-bold">Basics</h3>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border pf-border flex items-center justify-center shrink-0 bg-black/5">
                  {data.basics.photoUrl ? <img src={data.basics.photoUrl} alt="" className="w-full h-full object-cover" /> : <User size={26} className="pf-faint" />}
                </div>
                <div>
                  <label className="inline-flex items-center gap-1.5 text-sm font-medium text-[#db254f] cursor-pointer hover:underline"><ImagePlus size={15} /> Upload photo<input type="file" accept="image/*" className="hidden" onChange={pickImage((url) => setBasics("photoUrl", url))} /></label>
                  {data.basics.photoUrl && <button onClick={() => setBasics("photoUrl", "")} className="block text-xs pf-faint hover:text-rose-500 mt-1">Remove</button>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full Name"><input className={FIELD} value={data.basics.name} onChange={(e) => setBasics("name", e.target.value)} /></Field>
                <Field label="Headline" hint="e.g. Interior Designer | Residential"><input className={FIELD} value={data.basics.headline} onChange={(e) => setBasics("headline", e.target.value)} placeholder={disc.suggestedRoleTitles[0]} /></Field>
                <Field label="Email"><input className={FIELD} value={data.basics.email} onChange={(e) => setBasics("email", e.target.value)} /></Field>
                <Field label="Phone" hint="+91"><input className={FIELD} inputMode="tel" value={data.basics.phone} onChange={(e) => setBasics("phone", e.target.value)} /></Field>
                <Field label="City"><input className={FIELD} value={data.basics.location.city} onChange={(e) => setLoc("city", e.target.value)} /></Field>
                <Field label="State"><input className={FIELD} value={data.basics.location.state} onChange={(e) => setLoc("state", e.target.value)} /></Field>
                <Field label="Portfolio URL" hint="Behance / Dribbble / site"><input className={FIELD} value={data.basics.portfolioUrl} onChange={(e) => setBasics("portfolioUrl", e.target.value)} placeholder="https://…" /></Field>
                <Field label="Availability"><select className={FIELD} value={data.basics.availability} onChange={(e) => setBasics("availability", e.target.value)}>{AVAILABILITY.map((a) => <option key={a} value={a}>{a.replace("_", " ")}</option>)}</select></Field>
              </div>
              <Field label="Summary" hint="40–80 words"><textarea rows={3} className={`${FIELD} resize-y`} value={data.basics.summary} onChange={(e) => setBasics("summary", e.target.value)} placeholder={disc.summaryPlaceholder} /></Field>
              {/* Profiles */}
              <div>
                <label className="block text-xs pf-muted mb-1.5">Links / Profiles</label>
                <div className="space-y-2">
                  {(data.basics.profiles || []).map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input className={`${FIELD} max-w-[40%]`} placeholder="Network (LinkedIn…)" value={p.network} onChange={(e) => up((d) => { d.basics.profiles[i].network = e.target.value; })} />
                      <input className={FIELD} placeholder="https://…" value={p.url} onChange={(e) => up((d) => { d.basics.profiles[i].url = e.target.value; })} />
                      <button onClick={() => up((d) => d.basics.profiles.splice(i, 1))} className="shrink-0 w-9 rounded-lg border pf-border pf-muted hover:text-rose-500 flex items-center justify-center"><X size={14} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => up((d) => { d.basics.profiles = [...(d.basics.profiles || []), { network: "", url: "" }]; })} className="mt-2 inline-flex items-center gap-1 text-xs text-[#db254f] font-medium hover:underline"><Plus size={13} /> Add link</button>
              </div>
            </div>
          )}

          {/* EDUCATION */}
          {active === "education" && (
            <RepeaterShell title="Education" onAdd={() => addItem("education", blankEdu)}>
              {data.education.map((e, i) => (
                <div key={e.id} className="rounded-xl border pf-border p-3 space-y-3">
                  <div className="flex items-center justify-between"><span className="text-xs pf-faint font-semibold">Education {i + 1}</span>{actions("education", i)}</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input className={FIELD} placeholder="Institution" value={e.institution} onChange={(ev) => setItem("education", i, { institution: ev.target.value })} />
                    <input className={FIELD} placeholder="Program (e.g. Diploma in Interior Design)" value={e.program} onChange={(ev) => setItem("education", i, { program: ev.target.value })} />
                    <select className={FIELD} value={e.studyType} onChange={(ev) => setItem("education", i, { studyType: ev.target.value })}>{STUDY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                    <input className={FIELD} placeholder="Score (e.g. 82% or 8.4)" value={e.score?.value || ""} onChange={(ev) => setItem("education", i, { score: { system: e.score?.system || "PERCENTAGE", value: ev.target.value } })} />
                    <Field label="Start"><input type="month" className={FIELD} value={e.startDate} onChange={(ev) => setItem("education", i, { startDate: ev.target.value })} /></Field>
                    <Field label="End (blank = Present)"><input type="month" className={FIELD} value={e.endDate} onChange={(ev) => setItem("education", i, { endDate: ev.target.value })} /></Field>
                  </div>
                </div>
              ))}
            </RepeaterShell>
          )}

          {/* PROJECTS */}
          {active === "projects" && (
            <RepeaterShell title="Projects & Portfolio" subtitle="Your strongest section — design is judged on work." onAdd={() => addItem("projects", blankProject)}>
              {data.projects.map((p, i) => (
                <div key={p.id} className="rounded-xl border pf-border p-3 space-y-3">
                  <div className="flex items-center justify-between"><span className="text-xs pf-faint font-semibold">Project {i + 1}</span>{actions("projects", i)}</div>
                  <div className="flex gap-3">
                    <div className="w-28 h-20 rounded-lg overflow-hidden border pf-border flex items-center justify-center shrink-0 bg-black/5">
                      {p.coverImageUrl ? <img src={p.coverImageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={18} className="pf-faint" />}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input className={FIELD} placeholder="Project title" value={p.title} onChange={(ev) => setItem("projects", i, { title: ev.target.value })} />
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#db254f] cursor-pointer hover:underline"><ImagePlus size={13} /> {p.coverImageUrl ? "Change cover" : "Add cover image"}<input type="file" accept="image/*" className="hidden" onChange={pickImage((url) => setItem("projects", i, { coverImageUrl: url }))} /></label>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <select className={FIELD} value={p.type} onChange={(ev) => setItem("projects", i, { type: ev.target.value })}>{PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                    <input className={FIELD} placeholder="Your role" value={p.role} onChange={(ev) => setItem("projects", i, { role: ev.target.value })} />
                    <input className={FIELD} placeholder="Date (e.g. 2024)" value={p.date} onChange={(ev) => setItem("projects", i, { date: ev.target.value })} />
                  </div>
                  {/* tools */}
                  <div>
                    <label className="block text-xs pf-muted mb-1.5">Tools used</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">{p.tools.map((t, ti) => <span key={ti} className="inline-flex items-center gap-1 text-xs pf-chip rounded-full px-2.5 py-1">{t}<button onClick={() => rmTool(i, ti)} className="hover:text-rose-500"><X size={11} /></button></span>)}</div>
                    <input className={FIELD} placeholder="Type a tool, press Enter" onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); addTool(i, ev.target.value); ev.target.value = ""; } }} />
                  </div>
                  <textarea rows={2} className={`${FIELD} resize-y`} placeholder="Brief — the problem / context" value={p.brief} onChange={(ev) => setItem("projects", i, { brief: ev.target.value })} />
                  {bullets("projects", i)}
                  <input className={FIELD} placeholder="Link (Behance / Dribbble / PDF)" value={p.link} onChange={(ev) => setItem("projects", i, { link: ev.target.value })} />
                </div>
              ))}
            </RepeaterShell>
          )}

          {/* EXPERIENCE */}
          {active === "experience" && (
            <RepeaterShell title="Experience" onAdd={() => addItem("experience", blankExp)}>
              {data.experience.map((x, i) => (
                <div key={x.id} className="rounded-xl border pf-border p-3 space-y-3">
                  <div className="flex items-center justify-between"><span className="text-xs pf-faint font-semibold">Experience {i + 1}</span>{actions("experience", i)}</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input className={FIELD} placeholder="Organization" value={x.organization} onChange={(ev) => setItem("experience", i, { organization: ev.target.value })} />
                    <input className={FIELD} placeholder="Position" value={x.position} onChange={(ev) => setItem("experience", i, { position: ev.target.value })} />
                    <select className={FIELD} value={x.employmentType} onChange={(ev) => setItem("experience", i, { employmentType: ev.target.value })}>{EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                    <input className={FIELD} placeholder="Location" value={x.location} onChange={(ev) => setItem("experience", i, { location: ev.target.value })} />
                    <Field label="Start"><input type="month" className={FIELD} value={x.startDate} onChange={(ev) => setItem("experience", i, { startDate: ev.target.value })} /></Field>
                    <Field label="End (blank = Present)"><input type="month" className={FIELD} value={x.endDate} onChange={(ev) => setItem("experience", i, { endDate: ev.target.value })} /></Field>
                  </div>
                  {bullets("experience", i)}
                </div>
              ))}
            </RepeaterShell>
          )}

          {/* SKILLS */}
          {active === "skills" && (
            <div className="space-y-5">
              <div className="pf-card p-6">
                <h3 className="font-bold mb-1">Skills</h3>
                <p className="pf-faint text-xs mb-3">Tap to add/remove — tailored to {disc.label}.</p>
                <div className="relative mb-4">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pf-faint" />
                  <input value={skillQuery} onChange={(e) => setSkillQuery(e.target.value)} placeholder="Search any skill (all disciplines)…" className={`${FIELD} pl-9`} />
                </div>
                {searchResults.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {searchResults.map((s) => <button key={s} onClick={() => { toggleSkill("Additional Skills", s); setSkillQuery(""); }} className="inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 border pf-border pf-hover">+ {s}</button>)}
                  </div>
                )}
                <div className="space-y-4">
                  {disc.skillCategories.map((cat) => (
                    <div key={cat.id}>
                      <div className="text-xs font-semibold pf-muted mb-2">{cat.label}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.skills.map((s) => { const on = skillSelected(s); return (
                          <button key={s} onClick={() => toggleSkill(cat.label, s)} className={`text-xs rounded-full px-2.5 py-1 border transition ${on ? "bg-[#db254f] text-white border-[#db254f]" : "pf-border pf-hover"}`}>{on ? "✓ " : ""}{s}</button>
                        ); })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <input className={FIELD} placeholder="Add a custom skill" value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && customSkill.trim()) { toggleSkill("Additional Skills", customSkill.trim()); setCustomSkill(""); } }} />
                  <button onClick={() => { if (customSkill.trim()) { toggleSkill("Additional Skills", customSkill.trim()); setCustomSkill(""); } }} className="shrink-0 rounded-xl border pf-border px-4 text-sm font-medium pf-hover">Add</button>
                </div>
              </div>

              {/* Software */}
              <div className="pf-card p-6">
                <div className="flex items-center justify-between mb-3"><h3 className="font-bold">Software</h3><button onClick={addSoftware} className="inline-flex items-center gap-1 text-sm text-[#db254f] font-medium hover:underline"><Plus size={14} /> Add</button></div>
                <div className="flex flex-wrap gap-1.5 mb-3">{disc.software.map((s) => { const on = (data.software || []).some((x) => x.name.toLowerCase() === s.toLowerCase()); return <button key={s} onClick={() => on ? up((d) => { d.software = d.software.filter((x) => x.name.toLowerCase() !== s.toLowerCase()); }) : up((d) => { d.software = [...(d.software || []), { name: s, level: "Intermediate" }]; })} className={`text-xs rounded-full px-2.5 py-1 border transition ${on ? "bg-[#db254f] text-white border-[#db254f]" : "pf-border pf-hover"}`}>{on ? "✓ " : ""}{s}</button>; })}</div>
                <div className="space-y-2">
                  {(data.software || []).map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input className={FIELD} placeholder="Software" value={s.name} onChange={(e) => setSoftware(i, { name: e.target.value })} />
                      <select className={`${FIELD} max-w-[40%]`} value={s.level} onChange={(e) => setSoftware(i, { level: e.target.value })}><option value="">Level…</option>{SOFTWARE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select>
                      <button onClick={() => rmSoftware(i)} className="shrink-0 w-9 rounded-lg border pf-border pf-muted hover:text-rose-500 flex items-center justify-center"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ACHIEVEMENTS */}
          {active === "achievements" && (
            <div className="space-y-5">
              <RepeaterShell title="Certifications" onAdd={() => addItem("certifications", blankCert)} compact>
                {data.certifications.map((c, i) => (
                  <div key={c.id} className="rounded-xl border pf-border p-3 space-y-2">
                    <div className="flex items-center justify-between"><span className="text-xs pf-faint font-semibold">#{i + 1}</span>{actions("certifications", i)}</div>
                    <div className="grid sm:grid-cols-2 gap-2"><input className={FIELD} placeholder="Name" value={c.name} onChange={(e) => setItem("certifications", i, { name: e.target.value })} /><input className={FIELD} placeholder="Issuer" value={c.issuer} onChange={(e) => setItem("certifications", i, { issuer: e.target.value })} /><input className={FIELD} placeholder="Date" value={c.date} onChange={(e) => setItem("certifications", i, { date: e.target.value })} /><input className={FIELD} placeholder="URL (optional)" value={c.url} onChange={(e) => setItem("certifications", i, { url: e.target.value })} /></div>
                  </div>
                ))}
              </RepeaterShell>
              <RepeaterShell title="Awards" onAdd={() => addItem("awards", blankAward)} compact>
                {data.awards.map((a, i) => (
                  <div key={a.id} className="rounded-xl border pf-border p-3 space-y-2">
                    <div className="flex items-center justify-between"><span className="text-xs pf-faint font-semibold">#{i + 1}</span>{actions("awards", i)}</div>
                    <div className="grid sm:grid-cols-3 gap-2"><input className={FIELD} placeholder="Title" value={a.title} onChange={(e) => setItem("awards", i, { title: e.target.value })} /><input className={FIELD} placeholder="Awarder" value={a.awarder} onChange={(e) => setItem("awards", i, { awarder: e.target.value })} /><input className={FIELD} placeholder="Date" value={a.date} onChange={(e) => setItem("awards", i, { date: e.target.value })} /></div>
                  </div>
                ))}
              </RepeaterShell>
              <RepeaterShell title="Exhibitions" onAdd={() => addItem("exhibitions", blankExhibition)} compact>
                {data.exhibitions.map((x, i) => (
                  <div key={x.id} className="rounded-xl border pf-border p-3 space-y-2">
                    <div className="flex items-center justify-between"><span className="text-xs pf-faint font-semibold">#{i + 1}</span>{actions("exhibitions", i)}</div>
                    <div className="grid sm:grid-cols-3 gap-2"><input className={FIELD} placeholder="Title" value={x.title} onChange={(e) => setItem("exhibitions", i, { title: e.target.value })} /><input className={FIELD} placeholder="Venue" value={x.venue} onChange={(e) => setItem("exhibitions", i, { venue: e.target.value })} /><input className={FIELD} placeholder="Date" value={x.date} onChange={(e) => setItem("exhibitions", i, { date: e.target.value })} /></div>
                  </div>
                ))}
              </RepeaterShell>
              <RepeaterShell title="Workshops" onAdd={() => addItem("workshops", blankWorkshop)} compact>
                {data.workshops.map((w, i) => (
                  <div key={w.id} className="rounded-xl border pf-border p-3 space-y-2">
                    <div className="flex items-center justify-between"><span className="text-xs pf-faint font-semibold">#{i + 1}</span>{actions("workshops", i)}</div>
                    <div className="grid sm:grid-cols-3 gap-2"><input className={FIELD} placeholder="Title" value={w.title} onChange={(e) => setItem("workshops", i, { title: e.target.value })} /><input className={FIELD} placeholder="Organizer" value={w.organizer} onChange={(e) => setItem("workshops", i, { organizer: e.target.value })} /><input className={FIELD} placeholder="Date" value={w.date} onChange={(e) => setItem("workshops", i, { date: e.target.value })} /></div>
                  </div>
                ))}
              </RepeaterShell>
              <div className="pf-card p-6">
                <div className="flex items-center justify-between mb-3"><h3 className="font-bold">Languages</h3><button onClick={() => addItem("languages", blankLang)} className="inline-flex items-center gap-1 text-sm text-[#db254f] font-medium hover:underline"><Plus size={14} /> Add</button></div>
                <div className="space-y-2">
                  {data.languages.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <input className={FIELD} placeholder="Language" value={l.language} onChange={(e) => setItem("languages", i, { language: e.target.value })} />
                      <select className={`${FIELD} max-w-[45%]`} value={l.fluency} onChange={(e) => setItem("languages", i, { fluency: e.target.value })}>{FLUENCY.map((f) => <option key={f} value={f}>{f}</option>)}</select>
                      <button onClick={() => rmItem("languages", i)} className="shrink-0 w-9 rounded-lg border pf-border pf-muted hover:text-rose-500 flex items-center justify-center"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DESIGN */}
          {active === "design" && (
            <div className="space-y-5">
              <div className="pf-card p-6">
                <h3 className="font-bold mb-3">Template</h3>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATE_IDS.map((t) => (
                    <button key={t} onClick={() => up((d) => { d.template = t; })} className={`rounded-xl border p-3 text-left transition ${data.template === t ? "border-[#db254f] ring-2 ring-[#db254f]/20" : "pf-border pf-hover"}`}>
                      <div className="h-16 rounded-md mb-2 overflow-hidden" style={{ background: "linear-gradient(135deg,#f3f4f6,#e5e7eb)" }}><div className="h-2 w-10 m-2 rounded" style={{ background: data.accentColor }} /><div className="h-1 w-20 mx-2 rounded bg-gray-300" /><div className="h-1 w-16 mx-2 mt-1 rounded bg-gray-300" /></div>
                      <span className="text-sm font-semibold capitalize">{t.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pf-card p-6">
                <h3 className="font-bold mb-3">Accent colour</h3>
                <div className="flex gap-2">{ACCENT_COLORS.map((c) => <button key={c} onClick={() => up((d) => { d.accentColor = c; })} className={`w-8 h-8 rounded-full border-2 transition ${data.accentColor === c ? "ring-2 ring-offset-2 ring-[#db254f] border-white" : "border-transparent"}`} style={{ background: c }} />)}</div>
              </div>
              <div className="pf-card p-6">
                <h3 className="font-bold mb-1">Sections</h3>
                <p className="pf-faint text-xs mb-3">Reorder with the arrows, or hide a section.</p>
                <div className="space-y-2">
                  {data.sectionOrder.map((key, i) => {
                    const hidden = data.hiddenSections.includes(key);
                    return (
                      <div key={key} className="flex items-center gap-2 rounded-xl border pf-border px-3 py-2">
                        <span className={`flex-1 text-sm font-medium ${hidden ? "pf-faint line-through" : ""}`}>{SECTION_LABELS[key]}</span>
                        <button onClick={() => up((d) => { d.hiddenSections = hidden ? d.hiddenSections.filter((s) => s !== key) : [...d.hiddenSections, key]; })} className="text-xs pf-muted hover:text-[#db254f] px-2">{hidden ? "Show" : "Hide"}</button>
                        <button onClick={() => up((d) => { const j = i - 1; if (j < 0) return; [d.sectionOrder[i], d.sectionOrder[j]] = [d.sectionOrder[j], d.sectionOrder[i]]; })} disabled={i === 0} className="w-7 h-7 rounded-lg border pf-border pf-muted hover:text-[#db254f] disabled:opacity-30 flex items-center justify-center"><ChevronUp size={14} /></button>
                        <button onClick={() => up((d) => { const j = i + 1; if (j >= d.sectionOrder.length) return; [d.sectionOrder[i], d.sectionOrder[j]] = [d.sectionOrder[j], d.sectionOrder[i]]; })} disabled={i === data.sectionOrder.length - 1} className="w-7 h-7 rounded-lg border pf-border pf-muted hover:text-[#db254f] disabled:opacity-30 flex items-center justify-center"><ChevronDown size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="pf-card p-6 flex items-center justify-between">
                <div><div className="font-semibold text-sm">Load starter sample</div><div className="pf-faint text-xs">Fill the builder with an example for {disc.label}.</div></div>
                <button onClick={loadSample} className="rounded-full border pf-border px-4 py-2 text-sm font-semibold pf-hover">Load sample</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Live preview ── */}
        <div className={`lg:sticky lg:top-4 h-fit ${mobileView === "edit" ? "hidden lg:block" : ""}`}>
          <div className="rounded-2xl border pf-border overflow-hidden shadow-xl">
            {/* preview toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b pf-border" style={{ background: "rgba(var(--fg-rgb),0.03)" }}>
              <span className="text-xs pf-faint font-medium inline-flex items-center gap-1.5"><FileText size={13} className="text-[#db254f]" /> Live preview · A4 · <span className="capitalize">{(data.template || "minimal").replace("_", " ")}</span></span>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom("fit")} title="Fit width" className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${zoom === "fit" ? "bg-[#db254f] text-white" : "pf-muted pf-hover"}`}><Minimize2 size={13} /></button>
                <button onClick={() => setZoom(1)} title="Actual size" className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${zoom === 1 ? "bg-[#db254f] text-white" : "pf-muted pf-hover"}`}><Maximize2 size={13} /></button>
              </div>
            </div>
            {/* paper on a studio-gray backdrop */}
            <div className="p-4 overflow-auto" style={{ background: "#e9eaec", maxHeight: "calc(100vh - 150px)" }}>
              <div style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.18))" }}>
                <PreviewPane data={data} zoom={zoom} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden full-size paper for print/PDF */}
      <div style={{ position: "fixed", left: -99999, top: 0 }} aria-hidden><div ref={printRef}><ResumePaper data={data} /></div></div>
    </StudentShell>
  );
}

function RepeaterShell({ title, subtitle, onAdd, compact, children }) {
  return (
    <div className="pf-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div><h3 className="font-bold">{title}</h3>{subtitle && <p className="pf-faint text-xs mt-0.5">{subtitle}</p>}</div>
        <button onClick={onAdd} className="inline-flex items-center gap-1 text-sm text-[#db254f] font-medium hover:underline"><Plus size={14} /> Add</button>
      </div>
      <div className={compact ? "space-y-3" : "space-y-4"}>{children}</div>
    </div>
  );
}
