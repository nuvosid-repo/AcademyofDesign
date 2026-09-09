"use client";
import { useEffect, useState } from "react";
import { ClipboardCheck, HelpCircle, Users, Calendar, ExternalLink, ArrowRight } from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { apiFetch } from "@/lib/api";

function fmtDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function StudentAssessmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/student/assessments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.assessments || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentShell subtitle="Assessments">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Assessments</h2>
        <p className="pf-muted">Complete your MCQ tests and live interviews to earn your course certificate.</p>
      </div>

      {loading ? (
        <p className="pf-muted">Loading assessments…</p>
      ) : items.length === 0 ? (
        <div className="pf-card p-10 text-center">
          <div className="w-12 h-12 rounded-xl pf-chip flex items-center justify-center mx-auto mb-4"><ClipboardCheck size={22} /></div>
          <p className="pf-muted">No assessments available yet. They&apos;ll appear here once your course has them.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((a) => {
            const isMCQ = a.type === "MCQ";
            return (
              <div key={a.id} className="pf-card pf-card-hover p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isMCQ ? "pf-chip" : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"}`}>
                    {isMCQ ? <HelpCircle size={20} /> : <Users size={20} />}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${isMCQ ? "pf-chip" : "bg-indigo-500/15 text-indigo-400"}`}>{a.type}</span>
                </div>

                <h3 className="font-bold text-lg">{a.title}</h3>
                <p className="text-xs text-[#db254f] font-semibold uppercase tracking-wide mt-0.5">{a.course}</p>
                {a.description && <p className="text-sm pf-muted mt-2 flex-grow">{a.description}</p>}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pf-faint mt-4">
                  {isMCQ ? (
                    <>
                      <span className="inline-flex items-center gap-1"><HelpCircle size={12} /> {a.questionCount} question{a.questionCount !== 1 ? "s" : ""}</span>
                      <span>Pass: {a.passingScore}%</span>
                    </>
                  ) : (
                    <>
                      {a.interviewDate && <span className="inline-flex items-center gap-1"><Calendar size={12} /> {fmtDate(a.interviewDate)} {a.interviewTime}</span>}
                      {a.interviewer && <span>Interviewer: {a.interviewer}</span>}
                    </>
                  )}
                </div>

                <div className="mt-5">
                  {isMCQ ? (
                    <button className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 transition" disabled title="Test taking coming soon">
                      Start Test <ArrowRight size={15} />
                    </button>
                  ) : a.interviewLink ? (
                    <a href={a.interviewLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 transition">
                      <ExternalLink size={15} /> Join Interview
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium pf-muted">Interview will be scheduled</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}
