"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck, HelpCircle, FileText, Users, Calendar, ExternalLink,
  CheckCircle2, Clock, ArrowRight, Lock, RefreshCw, Award, Bot, ShieldAlert,
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
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState("");

  const load = () =>
    apiFetch("/api/student/assessments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.assessments || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // Start the second attempt (Set B), then jump straight into the exam.
  const retry = async (id) => {
    setRetrying(id);
    try {
      const res = await apiFetch(`/api/student/assessments/${id}/retry`, { method: "POST" });
      if (res.ok) router.push(`/student/assessments/${id}/exam`);
      else { const d = await res.json().catch(() => ({})); alert(d.error || "Could not start the retry."); }
    } finally { setRetrying(""); }
  };

  return (
    <StudentShell subtitle="Assessments">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-1">Assessments</h2>
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
            const onSetB = (a.attempt || 1) >= 2;
            return (
              <div key={a.id} className="pf-card p-6">
                {/* Header */}
                <div>
                  {examEnabled && (
                    <div className="float-right ml-4 mb-1">
                      {a.autoSubmittedForTabSwitch
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 px-3 py-1.5 rounded-full" style={{ background: "rgba(244,63,94,0.15)" }}><ShieldAlert size={13} /> Cancelled</span>
                        : a.canRetry
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 px-3 py-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)" }}><RefreshCw size={13} /> Failed · retry</span>
                        : a.combinedReady
                          ? (a.combinedPassed
                              ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500 px-3 py-1.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)" }}><CheckCircle2 size={14} /> Passed</span>
                              : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 px-3 py-1.5 rounded-full" style={{ background: "rgba(244,63,94,0.15)" }}>Not passed</span>)
                          : examDone
                            ? (a.interviewEnabled && !a.interviewGraded
                                ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 px-3 py-1.5 rounded-full" style={{ background: "rgba(99,102,241,0.15)" }}><Bot size={14} /> Interview pending</span>
                                : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 px-3 py-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)" }}><Clock size={13} /> Awaiting result</span>)
                            : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#db254f] px-3 py-1.5 rounded-full" style={{ background: "rgba(219,37,79,0.1)" }}>{onSetB ? "Attempt 2 · Set B" : "Pending"}</span>}
                    </div>
                  )}
                  <p className="text-xs text-[#db254f] font-semibold uppercase tracking-wide">{a.course}</p>
                  <h3 className="font-bold text-2xl md:text-3xl mt-0.5">{a.title}</h3>
                  {a.description && <p className="pf-muted text-sm mt-1.5 text-justify">{a.description}</p>}
                  {a.autoSubmittedForTabSwitch && (
                    <div className="mt-2.5 rounded-lg px-3 py-2 text-xs flex items-start gap-2 clear-both" style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.28)" }}>
                      <ShieldAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <span className="pf-muted">Your exam was submitted automatically because you left the exam tab {a.tabSwitches || 3} times.</span>
                    </div>
                  )}
                </div>

                {/* Section chips */}
                <div className="flex flex-wrap gap-2 mt-4 clear-both">
                  {a.mcqEnabled && <SectionChip icon={HelpCircle} label={`${a.mcqCount} MCQ`} />}
                  {a.writtenEnabled && <SectionChip icon={FileText} label={`${a.writtenQuestions.length} Written`} />}
                  {a.interviewEnabled && <SectionChip icon={Users} label="Live Interview" />}
                  {examEnabled && <SectionChip icon={Award} label={`Pass ≥ ${a.passingScore}% (combined)`} />}
                </div>

                {/* Action / status */}
                <div className="mt-5 pt-5 border-t pf-border flex flex-wrap items-center justify-between gap-4">
                  {/* Left: scores once done */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    {a.combinedReady && (
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <Award size={14} className="text-[#db254f]" /> <span className="pf-muted">Overall</span>
                        <span className={`font-extrabold ${a.combinedPassed ? "text-emerald-500" : "text-rose-500"}`}>{a.combinedPercentage}%</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${a.combinedPassed ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}>{a.combinedPassed ? "Pass" : "Fail"}</span>
                      </span>
                    )}
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
                    {a.autoSubmittedForTabSwitch ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 px-3 py-2 rounded-full" style={{ background: "rgba(244,63,94,0.12)" }}><ShieldAlert size={13} /> Exam cancelled — contact admin</span>
                    ) : (
                    <>
                    {a.canRetry ? (
                      <button onClick={() => retry(a.id)} disabled={retrying === a.id} className="btn-pill inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 shadow-md shadow-amber-500/30 transition disabled:opacity-60">
                        <RefreshCw size={15} /> {retrying === a.id ? "Starting…" : "Retry with Set B"}
                      </button>
                    ) : examEnabled && !examDone ? (
                      <Link href={`/student/assessments/${a.id}/exam`} className="btn-pill inline-flex items-center gap-2 bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-5 py-2.5 shadow-md shadow-rose-500/30 transition">
                        {onSetB ? "Start Set B" : "Start Assessment"} <ArrowRight size={16} />
                      </Link>
                    ) : null}

                    {/* AI interview — available once the exam is submitted */}
                    {a.interviewEnabled && !a.interviewGraded && (
                      examEnabled && !examDone ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium pf-faint px-3 py-2 rounded-full" style={{ background: "rgba(var(--fg-rgb),0.05)" }}><Lock size={12} /> Interview after exam</span>
                      ) : (
                        <Link href={`/student/assessments/${a.id}/interview`} className="btn-pill inline-flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 transition">
                          <Bot size={15} /> Start AI Interview
                        </Link>
                      )
                    )}
                    </>
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
