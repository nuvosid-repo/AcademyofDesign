"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck, HelpCircle, FileText, Users, Calendar, ExternalLink,
  CheckCircle2, Clock, ArrowRight, Lock,
} from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { apiFetch } from "@/lib/api";

function fmtDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
}

// "15:00" (24h) → "3:00 PM"
function fmtTime(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
  if (!m) return t || "";
  let h = +m[1];
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${m[2]} ${ap}`;
}

function SectionChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium pf-muted rounded-full px-3 py-1.5" style={{ background: "rgba(var(--fg-rgb),0.05)" }}>
      <Icon size={13} className="text-[#db254f]" /> {label}
    </span>
  );
}

export default function StudentAssessmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    apiFetch("/api/student/assessments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.assessments || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  return (
    <StudentShell subtitle="Assessments">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Assessments</h2>
        <p className="pf-muted">Take the timed exam (MCQ + written), then attend your live interview.</p>
      </div>

      {loading ? (
        <p className="pf-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="pf-card p-10 text-center">
          <div className="w-12 h-12 rounded-xl pf-chip flex items-center justify-center mx-auto mb-4"><ClipboardCheck size={22} /></div>
          <p className="pf-muted">No assessments available yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5 items-start">
          {items.map((a) => {
            const examEnabled = a.mcqEnabled || a.writtenEnabled;
            const examDone = (!a.mcqEnabled || a.mcqDone) && (!a.writtenEnabled || a.writtenSubmitted);
            return (
              <div key={a.id} className="pf-card p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-[#db254f] font-semibold uppercase tracking-wide">{a.course}</p>
                    <h3 className="font-bold text-lg mt-0.5">{a.title}</h3>
                    {a.description && <p className="pf-muted text-sm mt-1.5">{a.description}</p>}
                  </div>
                  {examEnabled && (
                    examDone
                      ? <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500 px-3 py-1.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)" }}><CheckCircle2 size={14} /> Exam done</span>
                      : <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[#db254f] px-3 py-1.5 rounded-full" style={{ background: "rgba(219,37,79,0.1)" }}>Pending</span>
                  )}
                </div>

                {/* Section chips */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {a.mcqEnabled && <SectionChip icon={HelpCircle} label={`${a.mcqCount} MCQ · pass ${a.passingScore}%`} />}
                  {a.writtenEnabled && <SectionChip icon={FileText} label={`${a.writtenQuestions.length} Written`} />}
                  {a.interviewEnabled && <SectionChip icon={Users} label="Live Interview" />}
                </div>

                {/* Action / status */}
                <div className="mt-5 pt-5 border-t pf-border flex flex-wrap items-center justify-between gap-4">
                  {/* Left: scores once done */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    {a.mcqEnabled && a.mcqDone && (
                      <span className="inline-flex items-center gap-1.5"><HelpCircle size={14} className="text-[#db254f]" /> <span className="pf-muted">MCQ</span> <span className="font-extrabold">{a.mcqPercentage}%</span></span>
                    )}
                    {a.writtenEnabled && (a.writtenGraded
                      ? <span className="inline-flex items-center gap-1.5"><FileText size={14} className="text-[#db254f]" /> <span className="pf-muted">Written</span> <span className="font-extrabold">{a.writtenScore}/{a.writtenTotal}</span></span>
                      : a.writtenSubmitted && <span className="inline-flex items-center gap-1.5 text-amber-500"><Clock size={13} /> Written awaiting grading</span>)}
                    {a.interviewEnabled && a.interviewGraded && (
                      <span className="inline-flex items-center gap-1.5"><Users size={14} className="text-[#db254f]" /> <span className="pf-muted">Interview</span> <span className="font-extrabold">{a.interviewScore}/{a.interviewTotal}</span></span>
                    )}
                  </div>

                  {/* Right: primary action */}
                  <div className="flex items-center gap-2">
                    {examEnabled && !examDone && (
                      <Link href={`/student/assessments/${a.id}/exam`} className="btn-pill inline-flex items-center gap-2 bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-5 py-2.5 shadow-md shadow-rose-500/30 transition">
                        Start Assessment <ArrowRight size={16} />
                      </Link>
                    )}

                    {/* Interview becomes available after the exam is done */}
                    {a.interviewEnabled && !a.interviewGraded && (
                      examEnabled && !examDone ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium pf-faint px-3 py-2 rounded-full" style={{ background: "rgba(var(--fg-rgb),0.05)" }}><Lock size={12} /> Interview after exam</span>
                      ) : a.interviewLink ? (
                        <a href={a.interviewLink} target="_blank" rel="noreferrer" className="btn-pill inline-flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 transition">
                          <ExternalLink size={14} /> Join Interview{(a.interviewDate || a.interviewTime) ? ` at ${[fmtDate(a.interviewDate), fmtTime(a.interviewTime)].filter(Boolean).join(" ")}` : ""}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs pf-faint">
                          {(a.interviewDate || a.interviewTime) ? <><Calendar size={12} /> {fmtDate(a.interviewDate)} {fmtTime(a.interviewTime)}</> : "Interview will be scheduled"}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}
