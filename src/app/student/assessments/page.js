"use client";
import { useEffect, useState } from "react";
import { ClipboardCheck, HelpCircle, FileText, Users, Calendar, ExternalLink, CheckCircle2, Clock, X } from "lucide-react";
import { createPortal } from "react-dom";
import StudentShell from "@/components/portal/StudentShell";
import { apiFetch } from "@/lib/api";

function fmtDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
}

/* MCQ taking modal */
function McqModal({ assessment, onClose, onDone }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const qs = assessment.mcqQuestions || [];

  const submit = async () => {
    if (Object.keys(answers).length < qs.length) { setError("Please answer all questions."); return; }
    setSubmitting(true); setError("");
    const res = await apiFetch(`/api/student/assessments/${assessment.id}/mcq`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: qs.map((_, i) => answers[i] ?? -1) }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (res.ok) onDone(d); else setError(d.error || "Failed");
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto pf-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><HelpCircle size={18} className="text-[#db254f]" /> {assessment.title} — MCQ</h3>
          <button onClick={onClose} className="pf-muted hover:text-[#db254f]"><X size={20} /></button>
        </div>
        <div className="space-y-5">
          {qs.map((q, qi) => (
            <div key={qi}>
              <p className="font-semibold text-sm mb-2"><span className="text-[#db254f]">Q{qi + 1}.</span> {q.question}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <button key={oi} type="button" onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm text-left transition ${answers[qi] === oi ? "border-[#db254f] bg-[rgba(219,37,79,0.08)]" : "pf-border pf-hover"}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${answers[qi] === oi ? "bg-[#db254f] text-white" : "pf-faint border pf-border"}`}>{String.fromCharCode(65 + oi)}</span>
                    <span className="flex-1">{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-rose-500 mt-3">{error}</p>}
        <button onClick={submit} disabled={submitting} className="mt-5 btn-pill inline-flex items-center gap-2 bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-6 py-2.5 disabled:opacity-60 transition">
          {submitting ? "Submitting…" : "Submit MCQ"} <CheckCircle2 size={15} />
        </button>
      </div>
    </div>, document.body);
}

/* Written exam modal */
function WrittenModal({ assessment, onClose, onDone }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const qs = assessment.writtenQuestions || [];

  const submit = async () => {
    setSubmitting(true); setError("");
    const res = await apiFetch(`/api/student/assessments/${assessment.id}/written`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: qs.map((_, i) => answers[i] || "") }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (res.ok) onDone(); else setError(d.error || "Failed");
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto pf-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><FileText size={18} className="text-[#db254f]" /> {assessment.title} — Written Exam</h3>
          <button onClick={onClose} className="pf-muted hover:text-[#db254f]"><X size={20} /></button>
        </div>
        <p className="pf-muted text-sm mb-4">Answer each question. Your answers will be graded by your instructor.</p>
        <div className="space-y-4">
          {qs.map((q, qi) => (
            <div key={qi}>
              <p className="font-semibold text-sm mb-2"><span className="text-[#db254f]">Q{qi + 1}.</span> {q.question} <span className="pf-faint font-normal">({q.maxMarks} marks)</span></p>
              <textarea rows={3} className="w-full rounded-xl border pf-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#db254f] resize-y" placeholder="Your answer…" value={answers[qi] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [qi]: e.target.value }))} />
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-rose-500 mt-3">{error}</p>}
        <button onClick={submit} disabled={submitting} className="mt-5 btn-pill inline-flex items-center gap-2 bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-6 py-2.5 disabled:opacity-60 transition">
          {submitting ? "Submitting…" : "Submit Answers"} <CheckCircle2 size={15} />
        </button>
      </div>
    </div>, document.body);
}

function ScorePill({ label, value, sub }) {
  return (
    <div className="rounded-xl border pf-border p-3 text-center">
      <div className="text-[11px] uppercase tracking-wide pf-faint">{label}</div>
      <div className="text-xl font-extrabold mt-0.5">{value}</div>
      {sub && <div className="text-[11px] pf-muted">{sub}</div>}
    </div>
  );
}

export default function StudentAssessmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mcqFor, setMcqFor] = useState(null);
  const [writtenFor, setWrittenFor] = useState(null);

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
        <p className="pf-muted">Complete the MCQ test, written exam and live interview for your courses.</p>
      </div>

      {loading ? (
        <p className="pf-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="pf-card p-10 text-center">
          <div className="w-12 h-12 rounded-xl pf-chip flex items-center justify-center mx-auto mb-4"><ClipboardCheck size={22} /></div>
          <p className="pf-muted">No assessments available yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((a) => (
            <div key={a.id} className="pf-card p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-lg">{a.title}</h3>
                  <p className="text-xs text-[#db254f] font-semibold uppercase tracking-wide mt-0.5">{a.course}</p>
                  {a.description && <p className="pf-muted text-sm mt-2">{a.description}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* MCQ */}
                {a.mcqEnabled && (
                  <div className="rounded-2xl border pf-border p-4">
                    <div className="flex items-center gap-2 mb-2"><HelpCircle size={16} className="text-[#db254f]" /><span className="font-semibold text-sm">MCQ Test</span></div>
                    <p className="text-xs pf-faint mb-3">{a.mcqCount} questions · pass {a.passingScore}%</p>
                    {a.mcqDone ? (
                      <div className="text-sm"><span className="font-extrabold text-lg">{a.mcqPercentage}%</span> <span className="pf-muted">({a.mcqScore}/{a.mcqTotal})</span><div className="text-xs text-emerald-500 mt-1 inline-flex items-center gap-1"><CheckCircle2 size={12} /> Completed</div></div>
                    ) : (
                      <button onClick={() => setMcqFor(a)} className="btn-pill inline-flex items-center gap-1.5 bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-4 py-2 transition">Start Test</button>
                    )}
                  </div>
                )}

                {/* Written */}
                {a.writtenEnabled && (
                  <div className="rounded-2xl border pf-border p-4">
                    <div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-[#db254f]" /><span className="font-semibold text-sm">Written Exam</span></div>
                    <p className="text-xs pf-faint mb-3">{a.writtenQuestions.length} questions</p>
                    {a.writtenGraded ? (
                      <div className="text-sm"><span className="font-extrabold text-lg">{a.writtenScore}/{a.writtenTotal}</span><div className="text-xs text-emerald-500 mt-1 inline-flex items-center gap-1"><CheckCircle2 size={12} /> Graded</div></div>
                    ) : a.writtenSubmitted ? (
                      <div className="text-xs text-amber-500 inline-flex items-center gap-1"><Clock size={12} /> Submitted — awaiting grading</div>
                    ) : (
                      <button onClick={() => setWrittenFor(a)} className="btn-pill inline-flex items-center gap-1.5 bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-4 py-2 transition">Take Exam</button>
                    )}
                  </div>
                )}

                {/* Interview */}
                {a.interviewEnabled && (
                  <div className="rounded-2xl border pf-border p-4">
                    <div className="flex items-center gap-2 mb-2"><Users size={16} className="text-[#db254f]" /><span className="font-semibold text-sm">Live Interview</span></div>
                    {(a.interviewDate || a.interviewTime) && <p className="text-xs pf-faint mb-2 inline-flex items-center gap-1"><Calendar size={12} /> {fmtDate(a.interviewDate)} {a.interviewTime}</p>}
                    {a.interviewGraded ? (
                      <div className="text-sm"><span className="font-extrabold text-lg">{a.interviewScore}/{a.interviewTotal}</span><div className="text-xs text-emerald-500 mt-1 inline-flex items-center gap-1"><CheckCircle2 size={12} /> Graded</div></div>
                    ) : a.interviewLink ? (
                      <a href={a.interviewLink} target="_blank" rel="noreferrer" className="btn-pill inline-flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 transition"><ExternalLink size={14} /> Join Interview</a>
                    ) : (
                      <div className="text-xs pf-faint">Interview will be scheduled</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mcqFor && <McqModal assessment={mcqFor} onClose={() => setMcqFor(null)} onDone={() => { setMcqFor(null); load(); }} />}
      {writtenFor && <WrittenModal assessment={writtenFor} onClose={() => setWrittenFor(null)} onDone={() => { setWrittenFor(null); load(); }} />}
    </StudentShell>
  );
}
