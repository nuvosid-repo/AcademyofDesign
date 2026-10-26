"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, ClipboardCheck, Plus, Check, HelpCircle, FileText, Users, ExternalLink, Award, RefreshCw, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import AdminShell from "@/components/portal/AdminShell";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { DatePicker, TimePicker } from "@/components/portal/DateTimePicker";
import { apiFetch } from "@/lib/api";

const STATUSES = ["Active", "Inactive"];

const blankMCQ = () => ({ question: "", options: ["", "", "", ""], correctIndex: 0, correctIndexes: [0], multiple: false, media: "" });
const blankMarked = () => ({ question: "", maxMarks: 10, modelAnswer: "", media: "" });

const EMPTY = {
  title: "", course: "", description: "", status: "Active",
  audience: "B2C", // B2C = whole course; B2B = individual (assigned to students from the Students page)
  mcqEnabled: false, questions: [blankMCQ()], passingScore: 60,
  writtenEnabled: false, writtenQuestions: [blankMarked()],
  interviewEnabled: false, interviewDate: "", interviewTime: "", interviewLink: "", interviewer: "",
  interviewQuestions: [blankMarked()],
  // Second attempt (Set B) — same structure, different questions.
  setBEnabled: false, questionsB: [blankMCQ()], writtenQuestionsB: [blankMarked()], interviewQuestionsB: [blankMarked()],
};

export default function AssessmentsPage() {
  const confirmDialog = useConfirm();
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [activeSet, setActiveSet] = useState("A"); // which set's questions are being edited
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const load = () =>
    apiFetch("/api/assessments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.assessments || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    apiFetch("/api/courses", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCourses((d.courses || []).map((c) => c.title)))
      .catch(() => setCourses([]));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Which set's question arrays the builders target (A = first, B = retry).
  const B = activeSet === "B";
  const qKey = B ? "questionsB" : "questions";
  const wKey = B ? "writtenQuestionsB" : "writtenQuestions";
  const iKey = B ? "interviewQuestionsB" : "interviewQuestions";

  // MCQ helpers (operate on the active set)
  const setQs = (u) => setForm((f) => ({ ...f, [qKey]: u(f[qKey] || []) }));
  const addQuestion = () => setQs((qs) => [...qs, blankMCQ()]);
  const rmQuestion = (i) => setQs((qs) => qs.filter((_, j) => j !== i));
  const updQuestion = (i, v) => setQs((qs) => qs.map((q, j) => (j === i ? { ...q, question: v } : q)));
  const updOption = (i, oi, v) => setQs((qs) => qs.map((q, j) => (j === i ? { ...q, options: q.options.map((o, k) => (k === oi ? v : o)) } : q)));
  const addOption = (i) => setQs((qs) => qs.map((q, j) => (j === i ? { ...q, options: [...(q.options || []), ""] } : q)));
  const rmOption = (i, oi) => setQs((qs) => qs.map((q, j) => {
    if (j !== i) return q;
    const options = (q.options || []).filter((_, k) => k !== oi);
    const correctIndexes = (q.correctIndexes || []).filter((c) => c !== oi).map((c) => (c > oi ? c - 1 : c));
    return { ...q, options, correctIndexes: correctIndexes.length ? correctIndexes : [0] };
  }));
  const toggleMultiple = (i) => setQs((qs) => qs.map((q, j) => {
    if (j !== i) return q;
    const multiple = !q.multiple;
    const correctIndexes = multiple ? (q.correctIndexes || []) : (q.correctIndexes || []).slice(0, 1);
    return { ...q, multiple, correctIndexes: correctIndexes.length ? correctIndexes : [0] };
  }));
  const setMedia = (i, v) => setQs((qs) => qs.map((q, j) => (j === i ? { ...q, media: v } : q)));
  const onMediaFile = (i, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Attachment must be under 5 MB."); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => setMedia(i, reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const toggleCorrect = (i, oi) => setQs((qs) => qs.map((q, j) => {
    if (j !== i) return q;
    const cur = q.correctIndexes || [];
    if (q.multiple) {
      const next = cur.includes(oi) ? cur.filter((c) => c !== oi) : [...cur, oi].sort((a, b) => a - b);
      return { ...q, correctIndexes: next.length ? next : [] };
    }
    return { ...q, correctIndexes: [oi] };
  }));

  // Marked-question helpers (written / interview)
  const addMarked = (key) => setForm((f) => ({ ...f, [key]: [...(f[key] || []), blankMarked()] }));
  const rmMarked = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, j) => j !== i) }));
  const setMarked = (key, i, field, v) => setForm((f) => ({ ...f, [key]: f[key].map((q, j) => (j === i ? { ...q, [field]: v } : q)) }));
  const onMarkedMediaFile = (key, i, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Attachment must be under 5 MB."); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => setMarked(key, i, "media", reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const reset = () => { setForm(EMPTY); setActiveSet("A"); setEditingId(null); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (form.audience !== "B2B" && !form.course) { setError("Select a course for this assessment (or choose Individual)"); return; }
    if (!form.mcqEnabled && !form.writtenEnabled && !form.interviewEnabled) { setError("Enable at least one section"); return; }
    if (form.mcqEnabled && !form.questions.some((q) => q.question.trim())) { setError("Add at least one MCQ question in Set A"); return; }
    if (form.setBEnabled && form.mcqEnabled && !(form.questionsB || []).some((q) => q.question.trim())) { setError("Set B is enabled — add at least one MCQ question in Set B (switch to the Set B tab)"); return; }
    setSaving(true);
    try {
      const res = editingId
        ? await apiFetch(`/api/assessments/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        : await apiFetch("/api/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      reset();
      load();
    } finally {
      setSaving(false);
    }
  };

  const loadMCQ = (arr) => (arr && arr.length) ? arr.map((q) => {
    const options = (q.options && q.options.length) ? q.options : ["", "", "", ""];
    let correctIndexes = (Array.isArray(q.correctIndexes) && q.correctIndexes.length) ? q.correctIndexes : (q.correctIndex != null ? [q.correctIndex] : [0]);
    return { question: q.question || "", options, correctIndex: correctIndexes[0] ?? 0, correctIndexes, multiple: !!q.multiple || correctIndexes.length > 1, media: q.media || "" };
  }) : [blankMCQ()];
  const loadMarked = (arr) => (arr && arr.length) ? arr.map((q) => ({ question: q.question || "", maxMarks: q.maxMarks ?? 10, modelAnswer: q.modelAnswer || "", media: q.media || "" })) : [blankMarked()];

  const editItem = async (row) => {
    setEditingId(row.id);
    setActiveSet("A");
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    // The list omits question media for speed — fetch the full assessment to edit.
    let a = row;
    try { const r = await apiFetch(`/api/assessments/${row.id}`, { cache: "no-store" }); const d = await r.json(); if (r.ok && d.assessment) a = d.assessment; } catch { /* fall back to row */ }
    setForm({
      title: a.title, course: a.course || "", description: a.description || "", status: a.status || "Active",
      audience: a.audience === "B2B" ? "B2B" : "B2C",
      mcqEnabled: !!a.mcqEnabled,
      questions: loadMCQ(a.questions),
      passingScore: a.passingScore || 60,
      writtenEnabled: !!a.writtenEnabled,
      writtenQuestions: loadMarked(a.writtenQuestions),
      interviewEnabled: !!a.interviewEnabled,
      interviewDate: a.interviewDate || "", interviewTime: a.interviewTime || "", interviewLink: a.interviewLink || "", interviewer: a.interviewer || "",
      interviewQuestions: loadMarked(a.interviewQuestions),
      setBEnabled: !!a.setBEnabled,
      questionsB: loadMCQ(a.questionsB),
      writtenQuestionsB: loadMarked(a.writtenQuestionsB),
      interviewQuestionsB: loadMarked(a.interviewQuestionsB),
    });
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteItem = async (id) => {
    const ok = await confirmDialog({ title: "Delete assessment?", text: "This assessment will be permanently removed." });
    if (!ok) return;
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (editingId === id) reset();
    await apiFetch(`/api/assessments/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const filtered = items.filter((a) => [a.title, a.course].join(" ").toLowerCase().includes(search.toLowerCase()));
  const shown = filtered.slice(0, pageSize);

  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white transition";
  const label = "block text-sm text-gray-600 mb-1.5";

  const Toggle = ({ on, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 46, height: 26, borderRadius: 9999, padding: 0, border: "none",
        background: on ? "#db254f" : "#d1d5db", position: "relative", cursor: "pointer",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20,
          borderRadius: 9999, background: "#fff", transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );

  const sectionCount = (a) => [a.mcqEnabled && "MCQ", a.writtenEnabled && "Written", a.interviewEnabled && "Interview"].filter(Boolean);

  return (
    <AdminShell title="Assessment" subtitle="Create combined assessments — MCQ, Written exam & Live Interview.">
      <div className="flex justify-end mb-4">
        <Link href="/admin/assessments/score" className="inline-flex items-center gap-2 rounded-full btn-pill bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2 transition">
          <Award size={16} /> Assessment Results
        </Link>
      </div>

      {/* ---- Add / Edit ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center"><ClipboardCheck size={18} /></span>
          <h2 className="font-bold text-gray-900">{editingId ? "Edit Assessment" : "Add Assessment"}</h2>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className={label}>Title</label><input className={field} placeholder="e.g. Final Assessment" value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
            <div><label className={label}>Assessment type</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => set("audience", "B2C")} className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${form.audience === "B2C" ? "border-[#db254f] bg-rose-50 text-[#db254f]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>Whole Course</button>
                <button type="button" onClick={() => set("audience", "B2B")} className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${form.audience === "B2B" ? "border-[#db254f] bg-rose-50 text-[#db254f]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>Individual</button>
              </div>
            </div>
            <div><label className={label}>Status</label>
              <select className={field} value={form.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            </div>
          </div>

          {/* Audience target: a course (B2C) OR specific students (B2B) */}
          {form.audience === "B2C" ? (
            <div>
              <label className={label}>Course</label>
              <select className={field} value={form.course} onChange={(e) => set("course", e.target.value)}>
                <option value="">--Select course--</option>
                {courses.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Everyone enrolled in this course will see the assessment.</p>
            </div>
          ) : (
            <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: "#4338ca", border: "1px solid #6366f1" }}>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold mt-0.5 shrink-0" style={{ background: "#ffffff", color: "#4338ca" }}>Individual</span>
              <div className="text-sm leading-relaxed" style={{ color: "#ffffff" }}>Create this assessment now. Then go to <b>Students</b> → select the student(s) → <b>Assign Assessment</b> to give it to specific people. It won&apos;t appear for anyone until you assign it there.</div>
            </div>
          )}

          <div><label className={label}>Description</label><textarea rows={2} className={`${field} resize-y`} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={label}>Passing Criteria (%)</label>
              <input type="number" min={0} max={100} className={field} value={form.passingScore} onChange={(e) => set("passingScore", e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Combined MCQ + Written + Interview score needed to pass.</p>
            </div>
          </div>

          {/* ── Second attempt (Set B) ── */}
          <div className="rounded-2xl border border-gray-200 px-4 py-3 flex items-center justify-between" style={{ background: "rgba(99,102,241,0.06)" }}>
            <div>
              <span className="font-bold text-gray-900 flex items-center gap-2"><RefreshCw size={16} className="text-[#db254f]" /> Second Attempt (Set B)</span>
              <p className="text-xs text-gray-500 mt-0.5">Give a retry with a different set of questions if the student fails the MCQ on the first attempt.</p>
            </div>
            <Toggle on={form.setBEnabled} onClick={() => { const next = !form.setBEnabled; set("setBEnabled", next); if (!next) setActiveSet("A"); }} />
          </div>

          {form.setBEnabled && (
            <div className="flex flex-wrap items-center gap-2">
              {["A", "B"].map((sName) => (
                <button key={sName} type="button" onClick={() => setActiveSet(sName)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold btn-pill transition ${activeSet === sName ? "bg-[#db254f] text-white shadow-sm shadow-rose-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  Set {sName}{sName === "B" ? " · Retry" : " · First attempt"}
                </button>
              ))}
              <span className="text-xs text-gray-400 ml-1">Editing questions for <b className="text-gray-600">Set {activeSet}</b>. Passing % and interview schedule are shared by both sets.</span>
            </div>
          )}

          {/* ── MCQ section ── */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <span className="font-bold text-gray-900 flex items-center gap-2"><HelpCircle size={17} className="text-[#db254f]" /> MCQ Test <span className="text-xs font-normal text-gray-400">(auto-scored)</span></span>
              <Toggle on={form.mcqEnabled} onClick={() => set("mcqEnabled", !form.mcqEnabled)} />
            </div>
            {form.mcqEnabled && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-end">
                  <button type="button" onClick={addQuestion} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white px-4 py-2 transition"><Plus size={15} /> Add Question</button>
                </div>
                {(form[qKey] || []).map((q, qi) => {
                  const correct = q.correctIndexes || [];
                  return (
                  <div key={qi} className="rounded-2xl border border-gray-200 p-3">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-rose-100 text-[#db254f] text-xs font-bold flex items-center justify-center shrink-0 mt-1.5">{qi + 1}</span>
                      <input className={field} placeholder="Question" value={q.question} onChange={(e) => updQuestion(qi, e.target.value)} />
                      <button type="button" onClick={() => rmQuestion(qi)} className="shrink-0 w-9 h-9 rounded-full btn-pill bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>
                    </div>
                    <div className="pl-8 space-y-2.5">
                      {/* Optional image / PDF attachment */}
                      {q.media ? (
                        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
                          {q.media.startsWith("data:image") ? (
                            <img src={q.media} alt="attachment" className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0" />
                          ) : (
                            <span className="w-16 h-16 rounded-lg bg-rose-50 text-[#db254f] flex items-center justify-center shrink-0"><FileText size={22} /></span>
                          )}
                          <span className="text-xs text-gray-500 flex-1">{q.media.startsWith("data:image") ? "Image attached" : "PDF attached"} — shown to students with this question.</span>
                          <button type="button" onClick={() => setMedia(qi, "")} className="text-xs font-semibold text-rose-500 hover:underline shrink-0">Remove</button>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#db254f] cursor-pointer hover:underline">
                          <ImageIcon size={14} /> Add image / PDF to this question
                          <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => onMediaFile(qi, e)} />
                        </label>
                      )}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-gray-500">{q.multiple ? "Tick ALL correct options (student must select the exact set)" : "Tick the single correct option"}</span>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer select-none">
                          <input type="checkbox" checked={!!q.multiple} onChange={() => toggleMultiple(qi)} className="accent-[#db254f]" /> Multiple correct answers
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.options || []).map((opt, oi) => {
                          const on = correct.includes(oi);
                          return (
                            <div key={oi} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm transition ${on ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
                              <button type="button" onClick={() => toggleCorrect(qi, oi)} title="Mark as correct"
                                className={`shrink-0 w-5 h-5 ${q.multiple ? "rounded-md" : "rounded-full"} border-2 flex items-center justify-center transition ${on ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white text-transparent hover:border-emerald-400"}`}><Check size={12} strokeWidth={3} /></button>
                              <input type="text" className="flex-1 min-w-0 bg-transparent outline-none" placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => updOption(qi, oi, e.target.value)} />
                              {(q.options || []).length > 2 && (
                                <button type="button" onClick={() => rmOption(qi, oi)} title="Remove option" className="shrink-0 text-gray-300 hover:text-rose-500 transition"><X size={14} /></button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <button type="button" onClick={() => addOption(qi)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#db254f] hover:underline"><Plus size={13} /> Add option</button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Written / return exam ── */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <span className="font-bold text-gray-900 flex items-center gap-2"><FileText size={17} className="text-[#db254f]" /> Written / Return Exam <span className="text-xs font-normal text-gray-400">(admin-graded)</span></span>
              <Toggle on={form.writtenEnabled} onClick={() => set("writtenEnabled", !form.writtenEnabled)} />
            </div>
            {form.writtenEnabled && (
              <div className="p-4 space-y-3">
                <div className="flex justify-end">
                  <button type="button" onClick={() => addMarked(wKey)} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white px-4 py-2 transition"><Plus size={15} /> Add Question</button>
                </div>
                {(form[wKey] || []).map((q, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-3 items-start">
                      <span className="w-6 h-6 rounded-full bg-rose-100 text-[#db254f] text-xs font-bold flex items-center justify-center shrink-0 mt-2.5">{i + 1}</span>
                      <textarea rows={2} className={`${field} resize-y`} placeholder="Written question…" value={q.question} onChange={(e) => setMarked(wKey, i, "question", e.target.value)} />
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs text-gray-500">Max</label>
                        <input type="number" min={0} className="w-20 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2.5 text-sm outline-none" value={q.maxMarks} onChange={(e) => setMarked(wKey, i, "maxMarks", e.target.value)} />
                        <button type="button" onClick={() => rmMarked(wKey, i)} className="w-9 h-9 rounded-full btn-pill bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="sm:pl-9">
                      <textarea rows={2} className={`${field} resize-y`} placeholder="Model answer / grading notes (optional — helps the AI grade this answer accurately)" value={q.modelAnswer || ""} onChange={(e) => setMarked(wKey, i, "modelAnswer", e.target.value)} />
                    </div>
                    <div className="sm:pl-9">
                      {q.media ? (
                        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
                          {q.media.startsWith("data:image") ? (
                            <img src={q.media} alt="attachment" className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0" />
                          ) : (
                            <span className="w-16 h-16 rounded-lg bg-rose-50 text-[#db254f] flex items-center justify-center shrink-0"><FileText size={22} /></span>
                          )}
                          <span className="text-xs text-gray-500 flex-1">{q.media.startsWith("data:image") ? "Image attached" : "PDF attached"} — shown to students with this question.</span>
                          <button type="button" onClick={() => setMarked(wKey, i, "media", "")} className="text-xs font-semibold text-rose-500 hover:underline shrink-0">Remove</button>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#db254f] cursor-pointer hover:underline">
                          <ImageIcon size={14} /> Add image / PDF to this question
                          <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => onMarkedMediaFile(wKey, i, e)} />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Live interview ── */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <span className="font-bold text-gray-900 flex items-center gap-2"><Users size={17} className="text-[#db254f]" /> Live Interview <span className="text-xs font-normal text-gray-400">(interviewer-graded)</span></span>
              <Toggle on={form.interviewEnabled} onClick={() => set("interviewEnabled", !form.interviewEnabled)} />
            </div>
            {form.interviewEnabled && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div><label className={label}>Date</label><DatePicker value={form.interviewDate} onChange={(v) => set("interviewDate", v)} /></div>
                  <div><label className={label}>Time</label><TimePicker value={form.interviewTime} onChange={(v) => set("interviewTime", v)} /></div>
                  <div><label className={label}>Interviewer</label><input className={field} value={form.interviewer} onChange={(e) => set("interviewer", e.target.value)} /></div>
                  <div><label className={label}>Google Meet Link</label><input className={field} placeholder="https://meet.google.com/…" value={form.interviewLink} onChange={(e) => set("interviewLink", e.target.value)} /></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Interview Questions <span className="text-xs font-normal text-gray-400">(interviewer scores each within max marks)</span></span>
                  <button type="button" onClick={() => addMarked(iKey)} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white px-4 py-2 transition"><Plus size={15} /> Add Question</button>
                </div>
                {(form[iKey] || []).map((q, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-[#db254f] text-xs font-bold flex items-center justify-center shrink-0 mt-2.5">{i + 1}</span>
                    <textarea rows={2} className={`${field} resize-y`} placeholder="e.g. Rate the candidate's spoken English / IQ …" value={q.question} onChange={(e) => setMarked(iKey, i, "question", e.target.value)} />
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs text-gray-500">Max</label>
                      <input type="number" min={0} className="w-20 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2.5 text-sm outline-none" value={q.maxMarks} onChange={(e) => setMarked(iKey, i, "maxMarks", e.target.value)} />
                      <button type="button" onClick={() => rmMarked(iKey, i)} className="w-9 h-9 rounded-full btn-pill bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-7 py-2.5 shadow-sm shadow-rose-200 disabled:opacity-60 transition">
              {saving ? "Saving…" : editingId ? "Update" : "Submit"}
            </button>
            {editingId && <button type="button" onClick={reset} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>}
          </div>
        </div>
      </form>

      {/* ---- Table ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Assessments List</h3>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <label className="text-sm text-gray-500 flex items-center gap-2">Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-gray-300 rounded-xl px-2 py-1.5 text-sm outline-none">{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}</select> entries
          </label>
          <label className="text-sm text-gray-500 flex items-center gap-2">Search:
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-[#db254f]" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>{["Sr. No.", "Title", "Course", "Sections", "Status", "Actions"].map((h, i, a) => (
                <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">No assessments found.</td></tr>
              ) : (
                shown.map((a, i) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900 whitespace-normal max-w-[16rem]">{a.title}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {a.audience === "B2B"
                        ? <span className="inline-flex items-center gap-1.5"><span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">Individual</span> {(a.assignedStudentIds || []).length} student{(a.assignedStudentIds || []).length === 1 ? "" : "s"}</span>
                        : (a.course || "—")}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {sectionCount(a).map((s) => <span key={s} className="text-xs px-2 py-0.5 rounded-md font-medium bg-rose-50 text-[#db254f]">{s}</span>)}
                        {sectionCount(a).length === 0 && <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4"><span className={`text-xs px-2.5 py-1 rounded-md font-medium ${a.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{a.status}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => editItem(a)} title="Edit" className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center"><Pencil size={14} /></button>
                        <button onClick={() => deleteItem(a.id)} title="Delete" className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500 mt-4">Showing {shown.length === 0 ? 0 : 1} to {shown.length} of {filtered.length} entries</p>
      </div>
    </AdminShell>
  );
}
