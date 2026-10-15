"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, Eye, Download, X, Search, CheckCircle2, Award, BookOpen, ChevronDown, ArrowUpDown } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { apiFetch } from "@/lib/api";

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "—"; }
}

/* The printable resume layout (shared look with the student builder). */
function ResumePreview({ r, innerRef }) {
  const skills = (r.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <div ref={innerRef} className="resume-paper">
      <h1>{r.name || "—"}</h1>
      {r.title && <p className="title">{r.title}</p>}
      <div className="row">
        {r.email && <span>✉ {r.email}</span>}
        {r.phone && <span>☎ {r.phone}</span>}
        {r.location && <span>⚲ {r.location}</span>}
        {r.website && <span>🔗 {r.website}</span>}
      </div>
      {r.summary && (<><h2>Summary</h2><p className="sub">{r.summary}</p></>)}
      {(r.experience || []).some((e) => e.company || e.role) && (
        <><h2>Experience</h2>
          {r.experience.filter((e) => e.company || e.role).map((e, i) => (
            <div key={i} className="item">
              <div className="between"><h3>{e.role || "Role"}{e.company ? ` · ${e.company}` : ""}</h3><span className="period">{e.period}</span></div>
              {e.details && <p className="sub">{e.details}</p>}
            </div>
          ))}
        </>
      )}
      {(r.education || []).some((e) => e.school || e.degree) && (
        <><h2>Education</h2>
          {r.education.filter((e) => e.school || e.degree).map((e, i) => (
            <div key={i} className="item">
              <div className="between"><h3>{e.degree || "Degree"}</h3><span className="period">{e.year}</span></div>
              {e.school && <p className="sub">{e.school}</p>}
            </div>
          ))}
        </>
      )}
      {skills.length > 0 && (<><h2>Skills</h2><div>{skills.map((s) => <span key={s} className="chip">{s}</span>)}</div></>)}

      {/* Academy performance — included so it appears in the downloaded PDF too */}
      {(() => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const perf = (r.assessments || []).filter((a) => a.combinedReady);
        const certs = r.certificates || [];
        if (!perf.length && !certs.length) return null;
        return (
          <>
            {perf.length > 0 && (
              <><h2>Academy Performance</h2>
                {perf.map((a, i) => {
                  const bits = [a.mcqDone && `MCQ ${a.mcqPct}%`, a.writtenGraded && `Written ${a.writtenScore}/${a.writtenTotal}`, a.interviewGraded && `Interview ${a.interviewScore}/${a.interviewTotal}`].filter(Boolean).join(" · ");
                  return (
                    <div key={i} className="item">
                      <div className="between"><h3>{a.title}</h3><span className="period">{a.combinedPct}% · {a.passed ? "Pass" : "Fail"}</span></div>
                      {bits && <p className="sub">{bits}</p>}
                    </div>
                  );
                })}
              </>
            )}
            {certs.length > 0 && (
              <><h2>Certifications</h2>
                {certs.map((c, i) => (
                  <div key={i} className="item">
                    <div className="between"><h3>{c.course}</h3><span className="period">Certified</span></div>
                    {c.url && <p className="sub"><a href={origin + c.url} target="_blank" rel="noreferrer">View certificate</a></p>}
                  </div>
                ))}
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}

const PRINT_CSS = `*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}
body{padding:40px;color:#1a1a1a;line-height:1.5;}
h1{font-size:26px;} h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#db254f;border-bottom:2px solid #f0d3da;padding-bottom:4px;margin:18px 0 10px;}
h3{font-size:15px;} .muted{color:#666;} .title{color:#db254f;font-weight:600;margin-top:2px;} .row{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#555;margin-top:6px;}
.item{margin-bottom:10px;} .chip{display:inline-block;background:#fce8ee;color:#db254f;border-radius:6px;padding:3px 10px;font-size:12px;margin:0 6px 6px 0;}
.between{display:flex;justify-content:space-between;gap:12px;} .period{color:#888;font-size:12px;white-space:nowrap;}
p{font-size:13px;} .sub{color:#666;font-size:13px;} a{color:#db254f;text-decoration:underline;}`;

export default function AdminResumesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyComplete, setOnlyComplete] = useState(false);
  const [courseFilter, setCourseFilter] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState("recent"); // recent | score
  const [viewing, setViewing] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    apiFetch("/api/resumes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.resumes || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const download = (r) => {
    const html = printRef.current?.innerHTML || "";
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${r.name || "Resume"} — Resume</title><meta charset="utf-8" /><style>${PRINT_CSS}</style></head><body>${html}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  };

  const allCourses = [...new Set(items.flatMap((r) => (r.courses || []).map((c) => c.title)).filter(Boolean))].sort();

  const filtered = items
    .filter((r) => !onlyComplete || r.completed)
    .filter((r) => !courseFilter || (r.courses || []).some((c) => c.title === courseFilter))
    .filter((r) => !minScore || (r.topScore != null && r.topScore >= minScore))
    .filter((r) => [r.studentName, r.name, r.title, r.email, r.studentEmail].join(" ").toLowerCase().includes(search.toLowerCase()));
  const sorted = sortBy === "score"
    ? [...filtered].sort((a, b) => (b.topScore ?? -1) - (a.topScore ?? -1))
    : filtered;

  const completeCount = items.filter((r) => r.completed).length;

  const scoreColor = (p) => (p == null ? "#9ca3af" : p >= 75 ? "#10b981" : p >= 50 ? "#f59e0b" : "#db254f");

  return (
    <AdminShell title="Resume" subtitle="Resumes students have built in their portal.">
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-2xl font-extrabold text-gray-900">{items.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total resumes</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-2xl font-extrabold text-emerald-600">{completeCount}</div>
          <div className="text-xs text-gray-500 mt-1">Completed</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-2xl font-extrabold text-amber-500">{items.length - completeCount}</div>
          <div className="text-xs text-gray-500 mt-1">In progress</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={18} className="text-[#db254f]" /> Student Resumes</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Course filter */}
            <div className="relative">
              <BookOpen size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#db254f] pointer-events-none" />
              <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="appearance-none h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm text-gray-700 outline-none focus:border-[#db254f] cursor-pointer max-w-[12rem]">
                <option value="">All courses</option>
                {allCourses.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {/* Score threshold */}
            <div className="relative">
              <Award size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#db254f] pointer-events-none" />
              <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="appearance-none h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm text-gray-700 outline-none focus:border-[#db254f] cursor-pointer">
                <option value={0}>Any score</option>
                <option value={50}>Score ≥ 50%</option>
                <option value={75}>Score ≥ 75%</option>
                <option value={90}>Score ≥ 90%</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {/* Sort */}
            <div className="relative">
              <ArrowUpDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#db254f] pointer-events-none" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm text-gray-700 outline-none focus:border-[#db254f] cursor-pointer">
                <option value="recent">Latest</option>
                <option value="score">Top score</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {/* Completed-only toggle */}
            <button type="button" onClick={() => setOnlyComplete((v) => !v)}
              className={`h-10 rounded-xl border px-3.5 text-sm font-medium inline-flex items-center gap-2 transition ${onlyComplete ? "border-[#db254f] bg-rose-50 text-[#db254f]" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"}`}>
              <CheckCircle2 size={15} /> Completed
            </button>
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-[#db254f] w-40" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>{["Sr. No.", "Student", "Title", "Assessment Score", "Courses", "Completion", "Status", "Actions"].map((h, i, a) => (
                <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">No resumes found.</td></tr>
              ) : (
                sorted.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{r.studentName || r.name || "—"}</div>
                      <div className="text-xs text-gray-400">{r.email || r.studentEmail || ""}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{r.title || "—"}</td>
                    <td className="py-3 px-4">
                      {r.topScore != null
                        ? <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: scoreColor(r.topScore) }}>{r.topScore}%{r.topScore >= 75 && <Award size={13} />}</span>
                        : <span className="text-xs text-gray-400">Not graded</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {(r.courses?.length || 0) === 0 ? <span className="text-gray-400">—</span> : <span>{r.completedCourses}/{r.courses.length} <span className="text-xs text-gray-400">completed</span></span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${r.completion}%`, background: r.completed ? "#10b981" : "#db254f" }} />
                        </div>
                        <span className="text-xs text-gray-500">{r.completion}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${r.completed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.completed ? "Resume done" : "In progress"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => setViewing(r)} title="View" className="inline-flex items-center gap-1.5 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-xs font-semibold px-3 py-1.5"><Eye size={13} /> View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500 mt-4">Showing {filtered.length} of {items.length} resumes</p>
      </div>

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setViewing(null)}>
          <div className="w-full max-w-2xl my-8 bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-gray-900 truncate">{viewing.studentName || viewing.name}</span>
                {viewing.completed && <span className="text-xs text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 size={13} /> Complete</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => download(viewing)} className="inline-flex items-center gap-1.5 rounded-full bg-[#db254f] hover:bg-[#b91d40] text-white text-xs font-semibold px-3.5 py-2"><Download size={14} /> Download PDF</button>
                <button onClick={() => setViewing(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center"><X size={16} /></button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-5" style={{ background: "rgba(var(--fg-rgb),0.05)" }}>
              <div className="mx-auto rounded-xl overflow-hidden shadow-xl" style={{ maxWidth: 560 }}>
                <ResumePreview r={viewing} innerRef={printRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
