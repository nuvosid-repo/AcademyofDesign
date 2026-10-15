"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, FileText, Users, HelpCircle, Check, Save, User, Sparkles, Loader2 } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { apiFetch } from "@/lib/api";

export default function ScoreAssessmentPage() {
  const [assessments, setAssessments] = useState([]);
  const [aid, setAid] = useState("");
  const [data, setData] = useState(null); // { assessment, students }
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [sel, setSel] = useState(null); // selected student
  const [writtenMarks, setWrittenMarks] = useState([]);
  const [interviewMarks, setInterviewMarks] = useState([]);
  const [savingW, setSavingW] = useState(false);
  const [savingI, setSavingI] = useState(false);
  const [aiGrading, setAiGrading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    apiFetch("/api/assessments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAssessments((d.assessments || []).filter((a) => a.writtenEnabled || a.interviewEnabled)))
      .catch(() => setAssessments([]));
  }, []);

  const loadSubs = (id) => {
    setAid(id); setSel(null); setData(null);
    if (!id) return;
    setLoadingSubs(true);
    apiFetch(`/api/assessments/${id}/submissions`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoadingSubs(false));
  };

  const pickStudent = (st) => {
    setSel(st); setMsg("");
    const wq = st.writtenQuestions || data.assessment.writtenQuestions || [];
    const iq = st.interviewQuestions || data.assessment.interviewQuestions || [];
    setWrittenMarks(wq.map((q, i) => st.writtenBreakdown?.[i]?.marks ?? 0));
    setInterviewMarks(iq.map((q, i) => st.interviewBreakdown?.[i]?.marks ?? 0));
  };

  const grade = async (section) => {
    const marks = section === "written" ? writtenMarks : interviewMarks;
    section === "written" ? setSavingW(true) : setSavingI(true);
    try {
      const res = await apiFetch(`/api/assessments/${aid}/grade`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: sel.studentId, studentName: sel.name, section, marks }),
      });
      const d = await res.json();
      if (res.ok) { setMsg(`${section === "written" ? "Written" : "Interview"} score saved (${d.score}/${d.total}).`); loadSubs(aid); }
      else setMsg(d.error || "Failed");
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
      if (res.ok) { setMsg(`AI graded the written exam (${d.writtenScore}/${d.writtenTotal}). Re-open the student to review & adjust if needed.`); loadSubs(aid); }
      else setMsg(d.error || "AI grading failed");
    } finally { setAiGrading(false); }
  };

  const A = data?.assessment;
  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#db254f] focus:bg-white";

  return (
    <AdminShell title="Score Assessments" subtitle="Grade written exams & live interviews per student.">
      <Link href="/admin/assessments" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#db254f] text-sm mb-4"><ArrowLeft size={15} /> Back to Assessments</Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <label className="block text-sm text-gray-600 mb-1.5">Select Assessment</label>
        <select className="w-full md:max-w-md rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f]" value={aid} onChange={(e) => loadSubs(e.target.value)}>
          <option value="">--Choose an assessment to grade--</option>
          {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}{a.course ? ` · ${a.course}` : ""}</option>)}
        </select>
      </div>

      {loadingSubs && <p className="text-gray-400 text-sm mt-4">Loading students…</p>}

      {A && (
        <div className="grid lg:grid-cols-3 gap-5 mt-5 items-start">
          {/* Students list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Users size={17} className="text-[#db254f]" /> Enrolled Students</h3>
            {data.students.length === 0 ? (
              <p className="text-gray-400 text-sm">No students enrolled in {A.course || "this course"} yet.</p>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {data.students.map((st) => {
                  const active = sel?.studentId === st.studentId;
                  return (
                    <button key={st.studentId} onClick={() => pickStudent(st)} className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${active ? "border-[#db254f] bg-rose-50" : "border-gray-200 hover:bg-gray-50"}`}>
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] text-white text-xs font-bold flex items-center justify-center shrink-0">{st.name?.charAt(0)?.toUpperCase() || "S"}</span>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{st.name || "Student"}</div>
                          <div className="text-xs text-gray-400 truncate">{st.email}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2 text-[11px]">
                        {st.attempt >= 2 && <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">Set B</span>}
                        {A.mcqEnabled && <span className={`px-1.5 py-0.5 rounded ${st.mcqDone ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>MCQ {st.mcqDone ? `${st.mcqPercentage}%` : "—"}</span>}
                        {A.writtenEnabled && <span className={`px-1.5 py-0.5 rounded ${st.writtenGraded ? "bg-emerald-100 text-emerald-700" : st.writtenSubmitted ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"}`}>Written {st.writtenGraded ? `${st.writtenScore}/${st.writtenTotal}` : st.writtenSubmitted ? "to grade" : "—"}</span>}
                        {A.interviewEnabled && <span className={`px-1.5 py-0.5 rounded ${st.interviewGraded ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>Interview {st.interviewGraded ? `${st.interviewScore}/${st.interviewTotal}` : "—"}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grading panel */}
          <div className="lg:col-span-2 space-y-5">
            {!sel ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
                <User size={28} className="mx-auto mb-3 text-gray-300" />
                Select a student from the list to grade.
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] text-white font-bold flex items-center justify-center">{sel.name?.charAt(0)?.toUpperCase() || "S"}</span>
                    <div><div className="font-bold text-gray-900">{sel.name}</div><div className="text-xs text-gray-400">{sel.email}</div></div>
                  </div>
                  {A.mcqEnabled && <span className="text-sm"><span className="text-gray-500">MCQ: </span><span className="font-bold text-gray-900">{sel.mcqDone ? `${sel.mcqScore}/${sel.mcqTotal} (${sel.mcqPercentage}%)` : "Not taken"}</span></span>}
                </div>

                {msg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{msg}</div>}

                {/* Written grading */}
                {A.writtenEnabled && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={17} className="text-[#db254f]" /> Written / Return Exam</h3>
                      {sel.writtenSubmitted && (
                        <button onClick={aiGrade} disabled={aiGrading} className="inline-flex items-center gap-1.5 rounded-full btn-pill bg-gradient-to-r from-[#db254f] to-[#e56b85] text-white text-xs font-semibold px-3.5 py-2 disabled:opacity-60 transition">
                          {aiGrading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {aiGrading ? "Grading…" : "Grade with AI"}
                        </button>
                      )}
                    </div>
                    {sel.writtenGraded && (sel.writtenBreakdown?.some((b) => b.gradedBy === "ai")) && <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 mb-4 inline-flex items-center gap-1.5"><Sparkles size={13} /> Graded by AI — review the marks below and adjust if needed.</p>}
                    {!sel.writtenSubmitted && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">Student hasn&apos;t submitted the written exam yet — you can still enter marks.</p>}
                    <div className="space-y-4">
                      {(sel.writtenQuestions || A.writtenQuestions || []).map((q, i) => {
                        const ans = sel.writtenAnswers?.[i]?.answer;
                        return (
                          <div key={i} className="rounded-xl border border-gray-200 p-3">
                            <p className="font-semibold text-sm text-gray-800"><span className="text-[#db254f]">Q{i + 1}.</span> {q.question}</p>
                            {ans ? <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap bg-gray-50 rounded-lg p-2.5">{ans}</p> : <p className="text-xs text-gray-400 mt-1">No answer submitted.</p>}
                            <div className="flex items-center gap-2 mt-3">
                              <label className="text-sm text-gray-600">Marks</label>
                              <input type="number" min={0} max={q.maxMarks} className={`${field} w-24`} value={writtenMarks[i] ?? 0} onChange={(e) => setWrittenMarks((m) => m.map((x, j) => (j === i ? e.target.value : x)))} />
                              <span className="text-sm text-gray-400">/ {q.maxMarks}</span>
                            </div>
                            {sel.writtenBreakdown?.[i]?.feedback && (
                              <p className="text-xs mt-2 flex items-start gap-1.5 text-gray-500"><Sparkles size={13} className="text-[#db254f] shrink-0 mt-0.5" /> <span><b className="text-gray-600">AI feedback:</b> {sel.writtenBreakdown[i].feedback}</span></p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => grade("written")} disabled={savingW} className="mt-4 inline-flex items-center gap-2 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-6 py-2.5 disabled:opacity-60 transition"><Save size={15} /> {savingW ? "Saving…" : "Save Written Score"}</button>
                  </div>
                )}

                {/* Interview grading */}
                {A.interviewEnabled && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2"><Users size={17} className="text-[#db254f]" /> Live Interview</h3>
                    <p className="text-xs text-gray-400 mb-4">Interviewer: {A.interviewer || "—"} · Score each question within its max marks.</p>
                    <div className="space-y-3">
                      {(sel.interviewQuestions || A.interviewQuestions || []).map((q, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-gray-200 p-3">
                          <p className="flex-1 text-sm text-gray-800"><span className="text-[#db254f] font-semibold">Q{i + 1}.</span> {q.question}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <input type="number" min={0} max={q.maxMarks} className={`${field} w-24`} value={interviewMarks[i] ?? 0} onChange={(e) => setInterviewMarks((m) => m.map((x, j) => (j === i ? e.target.value : x)))} />
                            <span className="text-sm text-gray-400">/ {q.maxMarks}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => grade("interview")} disabled={savingI} className="mt-4 inline-flex items-center gap-2 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-6 py-2.5 disabled:opacity-60 transition"><Save size={15} /> {savingI ? "Saving…" : "Save Interview Score"}</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
