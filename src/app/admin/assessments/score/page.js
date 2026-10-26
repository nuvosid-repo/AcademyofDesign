"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, FileText, Users, Save, Sparkles, Loader2, Video, Bot, X, Eye,
  Search, HelpCircle, Award, CheckCircle2, Clock, ShieldAlert,
} from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { apiFetch } from "@/lib/api";

export default function ScoreAssessmentPage() {
  const [assessments, setAssessments] = useState([]);
  const [aid, setAid] = useState("");
  const [data, setData] = useState(null); // { assessment, students }
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null); // student open in the View modal
  const [writtenMarks, setWrittenMarks] = useState([]);
  const [interviewMarks, setInterviewMarks] = useState([]);
  const [savingW, setSavingW] = useState(false);
  const [savingI, setSavingI] = useState(false);
  const [aiGrading, setAiGrading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    apiFetch("/api/assessments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAssessments((d.assessments || []).filter((a) => a.writtenEnabled || a.interviewEnabled || a.mcqEnabled)))
      .catch(() => setAssessments([]));
  }, []);

  const loadSubs = (id) => {
    setAid(id); setSel(null); setData(null); setQ("");
    if (!id) return;
    setLoadingSubs(true);
    apiFetch(`/api/assessments/${id}/submissions`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoadingSubs(false));
  };

  const openView = (st) => {
    setSel(st); setMsg("");
    const wq = st.writtenQuestions || data.assessment.writtenQuestions || [];
    const iq = st.interviewQuestions || data.assessment.interviewQuestions || [];
    setWrittenMarks(wq.map((_, i) => st.writtenBreakdown?.[i]?.marks ?? 0));
    setInterviewMarks(iq.map((_, i) => st.interviewBreakdown?.[i]?.marks ?? 0));
  };
  const closeView = () => { setSel(null); setMsg(""); };

  const grade = async (section) => {
    const marks = section === "written" ? writtenMarks : interviewMarks;
    section === "written" ? setSavingW(true) : setSavingI(true);
    try {
      const res = await apiFetch(`/api/assessments/${aid}/grade`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: sel.studentId, studentName: sel.name, section, marks }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg(`${section === "written" ? "Written" : "Interview"} score saved (${d.score}/${d.total}).`);
        // Refresh the table AND keep the modal open on the same student.
        const sid = sel.studentId;
        const r = await apiFetch(`/api/assessments/${aid}/submissions`, { cache: "no-store" });
        const nd = await r.json();
        setData(nd);
        const fresh = (nd.students || []).find((x) => x.studentId === sid);
        if (fresh) setSel(fresh);
      } else setMsg(d.error || "Failed");
    } finally { section === "written" ? setSavingW(false) : setSavingI(false); }
  };

  const aiGrade = async () => {
    if (!sel) return;
    setAiGrading(true); setMsg("");
    try {
      const res = await apiFetch(`/api/assessments/${aid}/ai-grade`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: sel.studentId }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg(`AI graded the written exam (${d.writtenScore}/${d.writtenTotal}). Review & adjust below if needed.`);
        const sid = sel.studentId;
        const r = await apiFetch(`/api/assessments/${aid}/submissions`, { cache: "no-store" });
        const nd = await r.json();
        setData(nd);
        const fresh = (nd.students || []).find((x) => x.studentId === sid);
        if (fresh) { setSel(fresh); setWrittenMarks((fresh.writtenQuestions || []).map((_, i) => fresh.writtenBreakdown?.[i]?.marks ?? 0)); }
      } else setMsg(d.error || "AI grading failed");
    } finally { setAiGrading(false); }
  };

  const A = data?.assessment;
  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#db254f] focus:bg-white";

  const rows = useMemo(() => {
    const list = data?.students || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((s) => (s.name || "").toLowerCase().includes(needle) || (s.email || "").toLowerCase().includes(needle));
  }, [data, q]);

  // Column badge helpers
  const mcqCell = (st) => st.mcqDone
    ? <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">{st.mcqPercentage}%</span>
    : <span className="text-gray-300">—</span>;
  const writtenCell = (st) => st.writtenGraded
    ? <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">{st.writtenScore}/{st.writtenTotal}</span>
    : st.writtenSubmitted
      ? <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">To grade</span>
      : <span className="text-gray-300">—</span>;
  const interviewCell = (st) => (
    <span className="inline-flex items-center gap-1.5">
      {st.interviewGraded
        ? <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">{st.interviewScore}/{st.interviewTotal}</span>
        : st.interviewVideoUrl
          ? <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">To grade</span>
          : <span className="text-gray-300">—</span>}
      {st.interviewVideoUrl && <Video size={13} className="text-[#db254f]" title="Recording available" />}
    </span>
  );
  const overallCell = (st) => st.combinedReady
    ? <span className={`inline-flex items-center gap-1.5 font-bold ${st.combinedPassed ? "text-emerald-600" : "text-rose-600"}`}>{st.combinedPercentage}%
        <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${st.combinedPassed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{st.combinedPassed ? "Pass" : "Fail"}</span>
      </span>
    : <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium"><Clock size={12} /> In progress</span>;

  return (
    <AdminShell title="Assessment Results" subtitle="Review each student's quiz, written exam & live interview — and grade them.">
      <Link href="/admin/assessments" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#db254f] text-sm mb-4"><ArrowLeft size={15} /> Back to Assessments</Link>

      {/* Assessment picker */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm text-gray-600 mb-1.5 font-medium">Select Assessment</label>
        <select className="w-full md:max-w-md rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f]" value={aid} onChange={(e) => loadSubs(e.target.value)}>
          <option value="">— Choose an assessment —</option>
          {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}{a.course ? ` · ${a.course}` : ""}</option>)}
        </select>
      </div>

      {loadingSubs && <p className="text-gray-400 text-sm mt-4">Loading students…</p>}

      {A && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-5 p-5">
          {/* Table header: title + search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users size={17} className="text-[#db254f]" /> {A.title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{A.course || "—"} · Pass mark ≥ {A.passingScore}% (combined) · {data.students.length} student{data.students.length === 1 ? "" : "s"}</p>
            </div>
            <div className="relative sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student…" className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-[#db254f] focus:bg-white" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="text-gray-500 text-left bg-gray-50">
                <tr>
                  {["Sr. No.", "Student", "MCQ", "Written", "Interview", "Overall", "Action"].map((h, i, a) => (
                    <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">{data.students.length === 0 ? `No students enrolled in ${A.course || "this course"} yet.` : "No students match your search."}</td></tr>
                ) : rows.map((st, i) => (
                  <tr key={st.studentId} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] text-white text-xs font-bold flex items-center justify-center shrink-0">{st.name?.charAt(0)?.toUpperCase() || "S"}</span>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">{st.name || "Student"}{st.attempt >= 2 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">Set B</span>}</div>
                          <div className="text-xs text-gray-400">{st.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{A.mcqEnabled ? mcqCell(st) : <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-4">{A.writtenEnabled ? writtenCell(st) : <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-4">{A.interviewEnabled ? interviewCell(st) : <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-4">{overallCell(st)}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => openView(st)} className="inline-flex items-center gap-1.5 btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-xs font-semibold px-3.5 py-2 transition"><Eye size={14} /> View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── View / grade modal ── */}
      {sel && A && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={closeView}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] text-white font-bold flex items-center justify-center shrink-0">{sel.name?.charAt(0)?.toUpperCase() || "S"}</span>
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 truncate">{sel.name || "Student"}</div>
                  <div className="text-xs text-gray-400 truncate">{sel.email}</div>
                </div>
              </div>
              <button onClick={closeView} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shrink-0"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Overall summary */}
              <div className="flex flex-wrap items-center gap-2.5">
                {A.mcqEnabled && <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200"><HelpCircle size={14} className="text-[#db254f]" /> MCQ: <b className="text-gray-900">{sel.mcqDone ? `${sel.mcqScore}/${sel.mcqTotal} (${sel.mcqPercentage}%)` : "Not taken"}</b></span>}
                {A.writtenEnabled && <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200"><FileText size={14} className="text-[#db254f]" /> Written: <b className="text-gray-900">{sel.writtenGraded ? `${sel.writtenScore}/${sel.writtenTotal}` : sel.writtenSubmitted ? "To grade" : "—"}</b></span>}
                {A.interviewEnabled && <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200"><Users size={14} className="text-[#db254f]" /> Interview: <b className="text-gray-900">{sel.interviewGraded ? `${sel.interviewScore}/${sel.interviewTotal}` : "—"}</b></span>}
                {sel.combinedReady && <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-semibold ${sel.combinedPassed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}><Award size={14} /> Overall {sel.combinedPercentage}% · {sel.combinedPassed ? "Pass" : "Fail"}</span>}
              </div>

              {msg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2"><CheckCircle2 size={15} /> {msg}</div>}

              {/* ── Exam proctoring (camera recording + head/eye flags) ── */}
              {(A.mcqEnabled || A.writtenEnabled) && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><Video size={16} className="text-[#db254f]" /> Exam Proctoring</h4>
                  {sel.autoSubmittedForTabSwitch ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 mb-3 flex items-start gap-2 text-sm">
                      <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <span className="text-rose-700"><b>Exam auto-submitted (cancelled):</b> this student left the exam tab {sel.tabSwitches || 3} times, so the exam was ended and submitted automatically.</span>
                    </div>
                  ) : sel.tabSwitches > 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 mb-3 text-xs text-amber-700 flex items-center gap-2">
                      <ShieldAlert size={14} className="shrink-0" /> Left the exam tab {sel.tabSwitches} time{sel.tabSwitches === 1 ? "" : "s"} during this exam.
                    </div>
                  ) : null}
                  {sel.examVideoUrl
                    ? <video src={sel.examVideoUrl} controls className="w-full rounded-xl border border-gray-200 bg-black max-h-[340px]" />
                    : <p className="text-xs text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-2.5">No exam recording {(sel.mcqDone || sel.writtenSubmitted) ? "was captured for this attempt." : "yet — the exam hasn't been taken."}</p>}
                  {(() => {
                    const flags = sel.proctorFlags || [];
                    const LABEL = { no_face: "Face not visible", multiple_faces: "Multiple people", looking_away: "Looked away" };
                    const byType = flags.reduce((m, f) => { m[f.type] = (m[f.type] || 0) + 1; return m; }, {});
                    const entries = Object.entries(byType);
                    const mmss = (s) => `${Math.floor((s || 0) / 60)}:${String((s || 0) % 60).padStart(2, "0")}`;
                    return (
                      <div className="mt-3">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><Eye size={13} className="text-[#db254f]" /> Flags ({flags.length})</div>
                        {entries.length === 0
                          ? <p className="text-xs text-emerald-600 font-medium">No violations detected — clean session ✓</p>
                          : <div className="flex flex-wrap gap-2">{entries.map(([t, c]) => <span key={t} className="text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium">{LABEL[t] || t}: {c}</span>)}</div>}
                        {flags.length > 0 && <div className="mt-2 text-[11px] text-gray-400 leading-relaxed">Timeline: {flags.slice(0, 25).map((f) => `${LABEL[f.type] || f.type} @ ${mmss(f.at)}`).join(" · ")}{flags.length > 25 ? " …" : ""}</div>}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Written ── */}
              {A.writtenEnabled && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={16} className="text-[#db254f]" /> Written Exam</h4>
                    {sel.writtenSubmitted && (
                      <button onClick={aiGrade} disabled={aiGrading} className="inline-flex items-center gap-1.5 rounded-full btn-pill bg-gradient-to-r from-[#db254f] to-[#e56b85] text-white text-xs font-semibold px-3.5 py-2 disabled:opacity-60 transition">
                        {aiGrading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {aiGrading ? "Grading…" : "Grade with AI"}
                      </button>
                    )}
                  </div>
                  {!sel.writtenSubmitted && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">Student hasn&apos;t submitted the written exam — you can still enter marks.</p>}
                  <div className="space-y-3">
                    {(sel.writtenQuestions || A.writtenQuestions || []).map((qq, i) => {
                      const ans = sel.writtenAnswers?.[i]?.answer;
                      return (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                          <p className="font-semibold text-sm text-gray-800"><span className="text-[#db254f]">Q{i + 1}.</span> {qq.question}</p>
                          {ans ? <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap bg-gray-50 rounded-lg p-2.5">{ans}</p> : <p className="text-xs text-gray-400 mt-1.5">No answer submitted.</p>}
                          <div className="flex items-center gap-2 mt-3">
                            <label className="text-sm text-gray-600">Marks</label>
                            <input type="number" min={0} max={qq.maxMarks} className={`${field} w-24`} value={writtenMarks[i] ?? 0} onChange={(e) => setWrittenMarks((m) => m.map((x, j) => (j === i ? e.target.value : x)))} />
                            <span className="text-sm text-gray-400">/ {qq.maxMarks}</span>
                          </div>
                          {sel.writtenBreakdown?.[i]?.feedback && <p className="text-xs mt-2 flex items-start gap-1.5 text-gray-500"><Sparkles size={13} className="text-[#db254f] shrink-0 mt-0.5" /> <span><b className="text-gray-600">AI:</b> {sel.writtenBreakdown[i].feedback}</span></p>}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => grade("written")} disabled={savingW} className="mt-3 inline-flex items-center gap-2 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-60 transition"><Save size={15} /> {savingW ? "Saving…" : "Save Written Score"}</button>
                </div>
              )}

              {/* ── Interview ── */}
              {A.interviewEnabled && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-1"><Users size={16} className="text-[#db254f]" /> Live Interview</h4>
                  <p className="text-xs text-gray-400 mb-3">Interviewer: {A.interviewer || "AI"} · Review the recording & answers, then score each question.</p>

                  {/* Recording */}
                  <div className="mb-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><Video size={13} className="text-[#db254f]" /> Recording</div>
                    {sel.interviewVideoUrl
                      ? <video src={sel.interviewVideoUrl} controls className="w-full rounded-xl border border-gray-200 bg-black max-h-[340px]" />
                      : <p className="text-xs text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-2.5">No recording yet — the candidate hasn&apos;t taken the live interview.</p>}
                  </div>

                  <div className="space-y-3">
                    {(sel.interviewQuestions || A.interviewQuestions || []).map((qq, i) => {
                      const b = sel.interviewBreakdown?.[i] || {};
                      return (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                            <p className="flex-1 text-sm text-gray-800"><span className="text-[#db254f] font-semibold">Q{i + 1}.</span> {qq.question}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <input type="number" min={0} max={qq.maxMarks} className={`${field} w-24`} value={interviewMarks[i] ?? 0} onChange={(e) => setInterviewMarks((m) => m.map((x, j) => (j === i ? e.target.value : x)))} />
                              <span className="text-sm text-gray-400">/ {qq.maxMarks}</span>
                            </div>
                          </div>
                          {b.answer ? <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap bg-gray-50 rounded-lg p-2.5"><b className="text-gray-500">Transcript:</b> {b.answer}</p> : <p className="text-[11px] text-gray-400 mt-1.5">No transcript captured.</p>}
                          {b.feedback && <p className="text-xs mt-2 flex items-start gap-1.5 text-gray-500"><Bot size={13} className="text-[#db254f] shrink-0 mt-0.5" /> <span><b className="text-gray-600">AI:</b> {b.feedback}</span></p>}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => grade("interview")} disabled={savingI} className="mt-3 inline-flex items-center gap-2 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-60 transition"><Save size={15} /> {savingI ? "Saving…" : "Save Interview Score"}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
