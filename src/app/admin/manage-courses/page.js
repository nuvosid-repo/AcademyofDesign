"use client";
import { useEffect, useState, Fragment } from "react";
import { Pencil, Trash2, Plus, X, BookOpen, Video as VideoIcon, FileText, Upload, ChevronDown, HelpCircle, Check, Box, Mic } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import SearchSelect from "@/components/portal/SearchSelect";
import MultiSelect from "@/components/portal/MultiSelect";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { DatePicker } from "@/components/portal/DateTimePicker";
import { apiFetch } from "@/lib/api";

const EMPTY = {
  title: "", shortDescription: "", instructor: "", instructors: [], price: "", lessons: "", duration: "",
  enrolledTillDate: "", startDate: "", endDate: "", thumbnail: "", subscriptionType: "B2C",
  banner: "", overview: "", introVideo: "", demoVideo: "", category: "", classes: [],
};

function fmtDate(d) {
  try {
    const dt = new Date(d);
    return {
      date: dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch { return { date: "—", time: "" }; }
}

export default function ManageCoursesPage() {
  const confirmDialog = useConfirm();

  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [thumbName, setThumbName] = useState("");
  const [bannerName, setBannerName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [openVideos, setOpenVideos] = useState(null);
  // Which curriculum items (classes/quizzes) are expanded in the editor. Default
  // collapsed so a long curriculum doesn't force endless scrolling.
  const [openCur, setOpenCur] = useState({});
  const toggleCur = (ci) => setOpenCur((o) => ({ ...o, [ci]: !o[ci] }));

  const load = () =>
    apiFetch("/api/courses", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCourses(d.courses || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    apiFetch("/api/instructors", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setInstructors((d.instructors || []).map((i) => i.name)))
      .catch(() => setInstructors([]));
    apiFetch("/api/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCategories((d.categories || []).map((c) => c.name)))
      .catch(() => setCategories([]));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // videos (links)
  // ── Classes (folders): each has its own videos + materials ──
  const setClasses = (updater) => setForm((f) => ({ ...f, classes: updater(f.classes) }));
  const mutClass = (ci, fn) => setClasses((cs) => cs.map((c, i) => (i === ci ? fn(c) : c)));

  const addClass = () => {
    const newIdx = form.classes.length; // the appended item lands here
    setClasses((cs) => {
      const n = cs.filter((c) => !c.type || c.type === "class").length + 1;
      return [...cs, { type: "class", name: `Class ${n}`, videos: [], materials: [], model3dHtml: "" }];
    });
    setOpenCur((o) => ({ ...o, [newIdx]: true })); // open the new class for editing
  };
  const updateClassName = (ci, v) => mutClass(ci, (c) => ({ ...c, name: v }));
  const updateClassModel3d = (ci, v) => mutClass(ci, (c) => ({ ...c, model3dHtml: v }));
  const removeClass = (ci) => setClasses((cs) => cs.filter((_, i) => i !== ci));

  // ── Quizzes: a curriculum item (type "quiz") holding questions ──
  const addQuiz = () => {
    const newIdx = form.classes.length;
    setClasses((cs) => {
      const n = cs.filter((c) => c.type === "quiz").length + 1;
      return [...cs, { type: "quiz", name: `Quiz ${n}`, videos: [], materials: [], questions: [{ question: "", options: ["", "", "", ""], correctIndex: 0 }] }];
    });
    setOpenCur((o) => ({ ...o, [newIdx]: true })); // open the new quiz for editing
  };
  const addQuestion = (ci) => mutClass(ci, (c) => ({ ...c, questions: [...(c.questions || []), { question: "", options: ["", "", "", ""], correctIndex: 0 }] }));
  const removeQuestion = (ci, qi) => mutClass(ci, (c) => ({ ...c, questions: (c.questions || []).filter((_, j) => j !== qi) }));
  const updateQuestion = (ci, qi, v) => mutClass(ci, (c) => ({ ...c, questions: c.questions.map((q, j) => (j === qi ? { ...q, question: v } : q)) }));
  const updateOption = (ci, qi, oi, v) => mutClass(ci, (c) => ({ ...c, questions: c.questions.map((q, j) => (j === qi ? { ...q, options: q.options.map((o, k) => (k === oi ? v : o)) } : q)) }));
  const setCorrect = (ci, qi, oi) => mutClass(ci, (c) => ({ ...c, questions: c.questions.map((q, j) => (j === qi ? { ...q, correctIndex: oi } : q)) }));

  // ── Written exam / AI interview: curriculum items holding marked questions ──
  const addMarkedItem = (type) => {
    const newIdx = form.classes.length;
    const label = type === "interview" ? "AI Interview" : "Written Exam";
    setClasses((cs) => {
      const n = cs.filter((c) => c.type === type).length + 1;
      return [...cs, { type, name: `${label} ${n}`, videos: [], materials: [], markedQuestions: [{ question: "", maxMarks: 10, modelAnswer: "" }] }];
    });
    setOpenCur((o) => ({ ...o, [newIdx]: true }));
  };
  const addWritten = () => addMarkedItem("written");
  const addInterview = () => addMarkedItem("interview");
  const addMarkedQ = (ci) => mutClass(ci, (c) => ({ ...c, markedQuestions: [...(c.markedQuestions || []), { question: "", maxMarks: 10, modelAnswer: "" }] }));
  const removeMarkedQ = (ci, qi) => mutClass(ci, (c) => ({ ...c, markedQuestions: (c.markedQuestions || []).filter((_, j) => j !== qi) }));
  const updateMarkedQ = (ci, qi, field, v) => mutClass(ci, (c) => ({ ...c, markedQuestions: (c.markedQuestions || []).map((q, j) => (j === qi ? { ...q, [field]: v } : q)) }));

  // videos within a class
  const addVideo = (ci) => mutClass(ci, (c) => ({ ...c, videos: [...c.videos, { title: "", url: "", description: "" }] }));
  const updateVideo = (ci, vi, k, v) => mutClass(ci, (c) => ({ ...c, videos: c.videos.map((vd, j) => (j === vi ? { ...vd, [k]: v } : vd)) }));
  const removeVideo = (ci, vi) => mutClass(ci, (c) => ({ ...c, videos: c.videos.filter((_, j) => j !== vi) }));

  // materials within a class
  const addMaterial = (ci) => mutClass(ci, (c) => ({ ...c, materials: [...c.materials, { name: "", fileName: "", type: "", data: "" }] }));
  const updateMaterialName = (ci, mi, v) => mutClass(ci, (c) => ({ ...c, materials: c.materials.map((m, j) => (j === mi ? { ...m, name: v } : m)) }));
  const removeMaterial = (ci, mi) => mutClass(ci, (c) => ({ ...c, materials: c.materials.filter((_, j) => j !== mi) }));
  const onMaterialFile = (ci, mi) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Each material file must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () =>
      mutClass(ci, (c) => ({ ...c, materials: c.materials.map((m, j) => (j === mi ? { ...m, fileName: file.name, type: file.type, data: reader.result } : m)) }));
    reader.readAsDataURL(file);
  };

  const onFile = (key, setName) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError("Image must be under 3MB"); return; }
    setName(file.name);
    const reader = new FileReader();
    reader.onload = () => set(key, reader.result);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm(EMPTY); setThumbName(""); setBannerName(""); setEditingId(null); setError(""); setOpenCur({});
  };

  const openAdd = () => { resetForm(); setShowForm(true); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const required = ["title", "shortDescription", "category", "price", "lessons", "duration", "enrolledTillDate", "subscriptionType"];
    if (required.some((f) => !String(form[f] || "").trim())) { setError("Please fill all required fields (*)"); return; }
    if (!form.instructors.length) { setError("Please select at least one instructor"); return; }
    setSaving(true);
    try {
      const cleanClasses = form.classes
        .map((c) => {
          if (c.type === "quiz") {
            const questions = (c.questions || [])
              .filter((q) => q.question.trim() && (q.options || []).some((o) => o.trim()))
              .map((q) => ({ question: q.question, options: q.options || [], correctIndex: q.correctIndex || 0 }));
            return { type: "quiz", name: c.name, videos: [], materials: [], questions };
          }
          if (c.type === "written" || c.type === "interview") {
            const markedQuestions = (c.markedQuestions || [])
              .filter((q) => (q.question || "").trim())
              .map((q) => ({ question: q.question.trim(), maxMarks: Number(q.maxMarks) || 0, modelAnswer: (q.modelAnswer || "").trim() }));
            return { type: c.type, name: c.name, videos: [], materials: [], markedQuestions };
          }
          return {
            type: "class",
            name: c.name,
            videos: c.videos.filter((v) => v.title.trim() || v.url.trim()),
            materials: c.materials.filter((m) => m.data),
            questions: [],
            model3dHtml: (c.model3dHtml || "").trim(),
          };
        })
        .filter((c) => {
          if (c.type === "quiz") return c.questions.length;
          if (c.type === "written" || c.type === "interview") return c.markedQuestions.length;
          return c.name.trim() || c.videos.length || c.materials.length || (c.model3dHtml || "").trim();
        });
      const payload = { ...form, instructor: form.instructors[0] || "", classes: cleanClasses, videos: [], materials: [] };
      const res = editingId
        ? await apiFetch(`/api/courses/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await apiFetch("/api/courses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      resetForm();
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const editCourse = async (c) => {
    setEditingId(c.id);
    setShowForm(true);
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    // The list omits heavy base64 (banner/thumbnail/classes) for speed — fetch the
    // full course here so editing keeps the existing media.
    let full = c;
    try {
      const res = await apiFetch(`/api/courses/${c.id}`, { cache: "no-store" });
      const d = await res.json();
      if (res.ok && d.course) full = d.course;
    } catch { /* fall back to the list row */ }
    setForm({
      title: full.title, shortDescription: full.shortDescription, instructor: full.instructor, instructors: full.instructors || [], price: full.price,
      lessons: full.lessons, duration: full.duration, enrolledTillDate: full.enrolledTillDate, startDate: full.startDate || "", endDate: full.endDate || "",
      thumbnail: full.thumbnail, subscriptionType: full.subscriptionType || "B2C",
      banner: full.banner, overview: full.overview, introVideo: full.introVideo || "", demoVideo: full.demoVideo || "", category: full.category || "",
      classes: (full.classes && full.classes.length)
        ? full.classes.map((cl) => (cl.type === "quiz"
            ? { type: "quiz", name: cl.name || "", videos: [], materials: [], questions: (cl.questions || []).map((q) => ({ question: q.question || "", options: (q.options && q.options.length) ? q.options : ["", "", "", ""], correctIndex: q.correctIndex || 0 })) }
            : (cl.type === "written" || cl.type === "interview")
            ? { type: cl.type, name: cl.name || "", videos: [], materials: [], markedQuestions: (cl.markedQuestions || []).map((q) => ({ question: q.question || "", maxMarks: q.maxMarks ?? 10, modelAnswer: q.modelAnswer || "" })) }
            : { type: "class", name: cl.name || "", videos: cl.videos || [], materials: cl.materials || [], questions: [], model3dHtml: cl.model3dHtml || "" }))
        : ((full.videos?.length || full.materials?.length)
            ? [{ type: "class", name: "Class 1", videos: full.videos || [], materials: full.materials || [], questions: [] }]
            : []),
    });
    setThumbName(full.thumbnail ? "current image" : "");
    setBannerName(full.banner ? "current image" : "");
  };

  const removeCourse = async (id) => {
    const ok = await confirmDialog({ title: "Delete course?", text: "This course will be permanently removed." });
    if (!ok) return;
    setCourses((cs) => cs.filter((c) => c.id !== id));
    if (editingId === id) { resetForm(); setShowForm(false); }
    await apiFetch(`/api/courses/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const filtered = courses.filter((c) =>
    [c.title, c.subscriptionType, c.category].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const shown = filtered.slice(0, pageSize);

  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white transition";
  const label = "block text-sm text-gray-600 mb-1.5";
  const Req = () => <span className="text-rose-500"> *</span>;
  const fileBtn = "flex items-center rounded-xl border border-gray-200 overflow-hidden";

  return (
    <AdminShell title="Courses" subtitle="Create and manage courses.">
      {/* ---- Add / Edit Course ---- */}
      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center"><BookOpen size={18} /></span>
              <h2 className="font-bold text-gray-900">{editingId ? "Edit Course" : "Add Course"}</h2>
            </div>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>

          <div className="p-6 space-y-5">
            {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

            {/* Title + Short Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={label}>Title<Req /></label>
                <input className={field} placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div>
                <label className={label}>Short Description<Req /></label>
                <textarea rows={3} className={`${field} resize-y`} placeholder="Short Description" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
              </div>
            </div>

            {/* Instructor, Price, Lessons, Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <label className={label}>Instructors<Req /><span className="text-gray-400 text-xs font-normal"> (select one or more)</span></label>
                <MultiSelect options={instructors} values={form.instructors} onChange={(vals) => set("instructors", vals)} placeholder="Select instructors" />
              </div>
              <div>
                <label className={label}>Course Price<Req /></label>
                <input className={field} value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
              <div>
                <label className={label}>Lessons<Req /></label>
                <input className={field} value={form.lessons} onChange={(e) => set("lessons", e.target.value)} />
              </div>
              <div>
                <label className={label}>Duration<Req /></label>
                <input className={field} value={form.duration} onChange={(e) => set("duration", e.target.value)} />
              </div>
            </div>

            {/* Selected instructors chips */}
            {form.instructors.length > 0 && (
              <div className="flex flex-wrap gap-2 -mt-1">
                {form.instructors.map((n) => (
                  <span key={n} className="inline-flex items-center gap-1.5 text-sm bg-rose-50 text-[#db254f] border border-rose-100 rounded-full btn-pill px-3 py-1.5">
                    {n}
                    <button type="button" onClick={() => set("instructors", form.instructors.filter((x) => x !== n))} className="hover:text-[#b91d40]" title="Remove"><X size={14} /></button>
                  </span>
                ))}
              </div>
            )}

            {/* Category, Subscription, Enrolled till, Thumbnail */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <label className={label}>Category<Req /></label>
                <SearchSelect options={categories} value={form.category} onChange={(v) => set("category", v)} placeholder="--Select category--" />
              </div>
              <div>
                <label className={label}>Subscription Type<Req /></label>
                <select className={field} value={form.subscriptionType} onChange={(e) => set("subscriptionType", e.target.value)}>
                  <option value="B2B">B2B (Business to Business)</option>
                  <option value="B2C">B2C (Business to Consumer)</option>
                </select>
              </div>
              <div>
                <label className={label}>Student Enrolled till date<Req /></label>
                <DatePicker value={form.enrolledTillDate} onChange={(v) => set("enrolledTillDate", v)} />
              </div>
              <div>
                <label className={label}>Course Start Date</label>
                <DatePicker value={form.startDate} onChange={(v) => set("startDate", v)} />
              </div>
              <div>
                <label className={label}>Course End Date</label>
                <DatePicker value={form.endDate} onChange={(v) => set("endDate", v)} />
              </div>
              <div>
                <label className={label}>Course Thumbnail</label>
                <div className={fileBtn}>
                  <label className="shrink-0 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 text-sm text-gray-700 cursor-pointer border-r border-gray-200">Choose file
                    <input type="file" accept="image/*" onChange={onFile("thumbnail", setThumbName)} className="hidden" />
                  </label>
                  <span className="px-3 text-xs text-gray-400 truncate">{thumbName || "No file chosen"}</span>
                </div>
              </div>
            </div>

            {/* Banner + website videos (course detail & demo pages) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={label}>Course Banner</label>
                <div className={fileBtn}>
                  <label className="shrink-0 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 text-sm text-gray-700 cursor-pointer border-r border-gray-200">Choose file
                    <input type="file" accept="image/*" onChange={onFile("banner", setBannerName)} className="hidden" />
                  </label>
                  <span className="px-3 text-xs text-gray-400 truncate">{bannerName || "No file chosen"}</span>
                </div>
              </div>
              <div>
                <label className={label}>Introduction Video URL<span className="text-gray-400 text-xs font-normal"> (detail page)</span></label>
                <input className={field} placeholder="YouTube / Vimeo / MP4 link" value={form.introVideo} onChange={(e) => set("introVideo", e.target.value)} />
              </div>
              <div>
                <label className={label}>Demo Video URL<span className="text-gray-400 text-xs font-normal"> (demo page)</span></label>
                <input className={field} placeholder="YouTube / Vimeo / MP4 link" value={form.demoVideo} onChange={(e) => set("demoVideo", e.target.value)} />
              </div>
            </div>

            {/* Course Overview */}
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Course Overview</h3>
              <textarea rows={5} className={`${field} resize-y`} placeholder="Write a detailed course overview…" value={form.overview} onChange={(e) => set("overview", e.target.value)} />
            </div>

            {/* Course Classes (folders) — each class has its own videos + materials */}
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><BookOpen size={16} className="text-[#db254f]" /> Course Curriculum</h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={addClass} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white px-4 py-2 transition"><Plus size={15} /> Add Class</button>
                  <button type="button" onClick={addQuiz} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full btn-pill bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 transition"><HelpCircle size={15} /> Add Quiz</button>
                  <button type="button" onClick={addWritten} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full btn-pill bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 transition"><FileText size={15} /> Add Written</button>
                  <button type="button" onClick={addInterview} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full btn-pill bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 transition"><Mic size={15} /> Add AI Interview</button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4">Add classes (videos + materials) and quizzes in order. Tip: add a <span className="text-indigo-600 font-medium">Quiz</span> after a few classes (e.g. after Class 5) to give students a quick test.</p>

              {form.classes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                  Nothing yet. Click <span className="text-[#db254f] font-medium">“Add Class”</span> or <span className="text-indigo-600 font-medium">“Add Quiz”</span> to build the curriculum.
                </div>
              ) : (
                <div className="space-y-4">
                  {form.classes.map((cls, ci) => cls.type === "quiz" ? (
                    <div key={ci} className="rounded-2xl border border-gray-200 overflow-hidden">
                      {/* Quiz header */}
                      <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                        <span className="w-7 h-7 rounded-full btn-pill bg-indigo-600 text-white flex items-center justify-center shrink-0"><HelpCircle size={15} /></span>
                        <input className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#db254f]" placeholder={`Quiz name`} value={cls.name} onChange={(e) => updateClassName(ci, e.target.value)} />
                        {!openCur[ci] && <span className="shrink-0 text-xs text-indigo-500 hidden md:inline">{(cls.questions || []).length} question{(cls.questions || []).length !== 1 ? "s" : ""}</span>}
                        <span className="shrink-0 text-[11px] font-bold tracking-wide text-indigo-500 bg-white border border-gray-200 rounded-full px-2.5 py-1">QUIZ</span>
                        <button type="button" onClick={() => toggleCur(ci)} title={openCur[ci] ? "Collapse" : "Expand"}
                          className="shrink-0 w-9 h-9 rounded-full btn-pill bg-white border border-gray-200 hover:bg-gray-100 text-indigo-500 flex items-center justify-center"><ChevronDown size={16} className={`transition-transform ${openCur[ci] ? "rotate-180" : ""}`} /></button>
                        <button type="button" onClick={() => removeClass(ci)} title="Remove quiz"
                          className="shrink-0 w-9 h-9 rounded-full btn-pill bg-white border border-gray-200 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>
                      </div>

                      {openCur[ci] && (
                      <div className="p-4 space-y-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400">Add questions with options and pick the correct answer (green radio). Students take this test inside the course.</p>
                        {(cls.questions || []).length === 0 ? (
                          <p className="text-xs text-gray-400">No questions yet.</p>
                        ) : (
                          <div className="space-y-4">
                            {cls.questions.map((q, qi) => (
                              <div key={qi} className="rounded-xl border border-gray-200 p-3">
                                <div className="flex items-start gap-2 mb-3">
                                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-1.5">{qi + 1}</span>
                                  <input className={field} placeholder="Question" value={q.question} onChange={(e) => updateQuestion(ci, qi, e.target.value)} />
                                  <button type="button" onClick={() => removeQuestion(ci, qi)} title="Remove question"
                                    className="shrink-0 w-9 h-9 rounded-full btn-pill bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                                  {(q.options && q.options.length ? q.options : ["", "", "", ""]).map((opt, oi) => (
                                    <div key={oi} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm transition ${q.correctIndex === oi ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50 focus-within:border-[#db254f] focus-within:bg-white"}`}>
                                      <button type="button" onClick={() => setCorrect(ci, qi, oi)} title="Mark this as the correct answer"
                                        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${q.correctIndex === oi ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white text-transparent hover:border-emerald-400"}`}>
                                        <Check size={12} strokeWidth={3} />
                                      </button>
                                      <input type="text" className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-gray-400" placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => updateOption(ci, qi, oi, e.target.value)} />
                                    </div>
                                  ))}
                                </div>
                                <p className="text-[11px] text-emerald-600 mt-2 pl-8 flex items-center gap-1"><Check size={12} strokeWidth={3} /> Correct answer: {(q.options && q.options[q.correctIndex]?.trim()) ? q.options[q.correctIndex] : `Option ${(q.correctIndex ?? 0) + 1}`} <span className="text-gray-400">(tap the circle to change)</span></p>
                              </div>
                            ))}
                          </div>
                        )}
                        <button type="button" onClick={() => addQuestion(ci)} className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"><Plus size={14} /> Add Question</button>
                      </div>
                      )}
                    </div>
                  ) : (cls.type === "written" || cls.type === "interview") ? (() => {
                    const isInt = cls.type === "interview";
                    return (
                    <div key={ci} className="rounded-2xl border border-gray-200 overflow-hidden">
                      {/* Written / AI-interview header */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                        <span className={`w-7 h-7 rounded-full btn-pill text-white flex items-center justify-center shrink-0 ${isInt ? "bg-teal-600" : "bg-amber-500"}`}>{isInt ? <Mic size={14} /> : <FileText size={14} />}</span>
                        <input className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#db254f]" placeholder={isInt ? "AI Interview name" : "Written Exam name"} value={cls.name} onChange={(e) => updateClassName(ci, e.target.value)} />
                        {!openCur[ci] && <span className="shrink-0 text-xs hidden md:inline" style={{ color: isInt ? "#0d9488" : "#d97706" }}>{(cls.markedQuestions || []).length} question{(cls.markedQuestions || []).length !== 1 ? "s" : ""}</span>}
                        <span className={`shrink-0 text-[11px] font-bold tracking-wide rounded-full px-2.5 py-1 bg-white border border-gray-200 ${isInt ? "text-teal-600" : "text-amber-600"}`}>{isInt ? "AI INTERVIEW" : "WRITTEN"}</span>
                        <button type="button" onClick={() => toggleCur(ci)} title={openCur[ci] ? "Collapse" : "Expand"} className={`shrink-0 w-9 h-9 rounded-full btn-pill bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center ${isInt ? "text-teal-600" : "text-amber-600"}`}><ChevronDown size={16} className={`transition-transform ${openCur[ci] ? "rotate-180" : ""}`} /></button>
                        <button type="button" onClick={() => removeClass(ci)} title="Remove"
                          className="shrink-0 w-9 h-9 rounded-full btn-pill bg-white border border-gray-200 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>
                      </div>

                      {openCur[ci] && (
                      <div className="p-4 space-y-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400">{isInt
                          ? "The AI reads each question aloud; the student answers by voice (camera stays on for proctoring). Each answer is AI-scored out of its marks."
                          : "The student types answers (camera stays on for proctoring). Each answer is AI-scored out of its marks."}</p>
                        {(cls.markedQuestions || []).length === 0 ? (
                          <p className="text-xs text-gray-400">No questions yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {cls.markedQuestions.map((q, qi) => (
                              <div key={qi} className="rounded-xl border border-gray-200 p-3">
                                <div className="flex items-start gap-2">
                                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0 mt-2.5">{qi + 1}</span>
                                  <textarea rows={2} className={`${field} resize-y`} placeholder="Question" value={q.question} onChange={(e) => updateMarkedQ(ci, qi, "question", e.target.value)} />
                                  <div className="flex items-center gap-2 shrink-0">
                                    <label className="text-xs text-gray-500">Max</label>
                                    <input type="number" min={0} className="w-20 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2.5 text-sm outline-none" value={q.maxMarks} onChange={(e) => updateMarkedQ(ci, qi, "maxMarks", e.target.value)} />
                                    <button type="button" onClick={() => removeMarkedQ(ci, qi)} title="Remove question" className="w-9 h-9 rounded-full btn-pill bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>
                                  </div>
                                </div>
                                <textarea rows={2} className={`${field} resize-y mt-2`} placeholder="Model answer (optional — helps the AI grade accurately)" value={q.modelAnswer || ""} onChange={(e) => updateMarkedQ(ci, qi, "modelAnswer", e.target.value)} />
                              </div>
                            ))}
                          </div>
                        )}
                        <button type="button" onClick={() => addMarkedQ(ci)} className={`inline-flex items-center gap-1.5 text-sm font-medium hover:underline ${isInt ? "text-teal-600" : "text-amber-600"}`}><Plus size={14} /> Add Question</button>
                      </div>
                      )}
                    </div>
                    );
                  })() : (
                    <div key={ci} className="rounded-2xl border border-gray-200 overflow-hidden">
                      {/* Class header */}
                      <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                        <span className="w-7 h-7 rounded-full btn-pill bg-[#db254f] text-white text-xs font-bold flex items-center justify-center shrink-0">{ci + 1}</span>
                        <input className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#db254f]" placeholder={`Class ${ci + 1} name`} value={cls.name} onChange={(e) => updateClassName(ci, e.target.value)} />
                        {!openCur[ci] && <span className="shrink-0 text-xs text-gray-400 hidden md:inline">{cls.videos.length} video{cls.videos.length !== 1 ? "s" : ""} · {cls.materials.length} material{cls.materials.length !== 1 ? "s" : ""}{cls.model3dHtml?.trim() ? " · 3D" : ""}</span>}
                        <button type="button" onClick={() => toggleCur(ci)} title={openCur[ci] ? "Collapse" : "Expand"}
                          className="shrink-0 w-9 h-9 rounded-full btn-pill bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 flex items-center justify-center"><ChevronDown size={16} className={`transition-transform ${openCur[ci] ? "rotate-180" : ""}`} /></button>
                        <button type="button" onClick={() => removeClass(ci)} title="Remove class"
                          className="shrink-0 w-9 h-9 rounded-full btn-pill bg-white border border-gray-200 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>
                      </div>

                      {openCur[ci] && (
                      <div className="p-4 space-y-5 border-t border-gray-100">
                        {/* Videos in this class */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><VideoIcon size={14} className="text-[#db254f]" /> Videos ({cls.videos.length})</h4>
                            <button type="button" onClick={() => addVideo(ci)} className="inline-flex items-center gap-1 text-xs text-[#db254f] font-medium hover:underline"><Plus size={13} /> Add Video</button>
                          </div>
                          {cls.videos.length === 0 ? (
                            <p className="text-xs text-gray-400">No videos in this class.</p>
                          ) : (
                            <div className="space-y-3">
                              {cls.videos.map((v, vi) => (
                                <div key={vi} className="rounded-xl border border-gray-200 p-3 relative">
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <input className={`${field} sm:max-w-xs`} placeholder="Video title" value={v.title} onChange={(e) => updateVideo(ci, vi, "title", e.target.value)} />
                                    <input className={`${field} pr-11`} placeholder="Video URL (YouTube / Vimeo / MP4)" value={v.url} onChange={(e) => updateVideo(ci, vi, "url", e.target.value)} />
                                    <button type="button" onClick={() => removeVideo(ci, vi)} title="Remove"
                                      className="absolute top-2 right-2 sm:static shrink-0 w-9 h-9 rounded-full btn-pill bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>
                                  </div>
                                  <textarea rows={2} className={`${field} mt-3 resize-y`} placeholder="Video description" value={v.description || ""} onChange={(e) => updateVideo(ci, vi, "description", e.target.value)} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Materials in this class */}
                        <div className="border-t border-gray-100 pt-4">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FileText size={14} className="text-[#db254f]" /> Materials ({cls.materials.length})</h4>
                            <button type="button" onClick={() => addMaterial(ci)} className="inline-flex items-center gap-1 text-xs text-[#db254f] font-medium hover:underline"><Plus size={13} /> Add Material</button>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">PDF, Excel, PPT, Word (max 5MB each).</p>
                          {cls.materials.length === 0 ? (
                            <p className="text-xs text-gray-400">No materials in this class.</p>
                          ) : (
                            <div className="space-y-3">
                              {cls.materials.map((m, mi) => (
                                <div key={mi} className="flex flex-col sm:flex-row gap-3 items-start">
                                  <input className={`${field} sm:max-w-xs`} placeholder="Material name (e.g. Notes)" value={m.name} onChange={(e) => updateMaterialName(ci, mi, e.target.value)} />
                                  <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden flex-1 min-w-0 w-full">
                                    <label className="shrink-0 inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 text-sm text-gray-700 cursor-pointer border-r border-gray-200"><Upload size={15} /> Choose file
                                      <input type="file" accept=".pdf,.xls,.xlsx,.ppt,.pptx,.doc,.docx,.csv" onChange={onMaterialFile(ci, mi)} className="hidden" />
                                    </label>
                                    {m.data ? (
                                      <a href={m.data} download={m.fileName} className="px-3 text-xs text-[#db254f] hover:underline truncate">{m.fileName}</a>
                                    ) : (
                                      <span className="px-3 text-xs text-gray-400 truncate">No file chosen</span>
                                    )}
                                  </div>
                                  <button type="button" onClick={() => removeMaterial(ci, mi)} title="Remove"
                                    className="shrink-0 w-10 h-10 rounded-full btn-pill bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center"><Trash2 size={16} /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 3D Model embed for this class */}
                        <div className="border-t border-gray-100 pt-4">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Box size={14} className="text-[#db254f]" /> 3D Model Embed</h4>
                            {cls.model3dHtml?.trim() ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">Added</span> : null}
                          </div>
                          <p className="text-xs text-gray-400 mb-2">Paste the embed HTML (e.g. a Sketchfab iframe, &lt;model-viewer&gt;, or Three.js). Students get a &quot;Show 3D Model&quot; button that opens it in a new tab. Leave empty for none.</p>
                          <textarea rows={4} className={`${field} resize-y font-mono text-xs`} placeholder={'<iframe src="https://sketchfab.com/models/.../embed" ...></iframe>\n— or —\n<model-viewer src="model.glb" camera-controls auto-rotate></model-viewer>'} value={cls.model3dHtml || ""} onChange={(e) => updateClassModel3d(ci, e.target.value)} />
                        </div>
                      </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-7 py-2.5 shadow-sm shadow-rose-200 disabled:opacity-60 transition">
                {saving ? "Saving…" : editingId ? "Update" : "Submit"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>
            </div>
          </div>
        </form>
      )}

      {/* ---- List Courses ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">List Courses</h3>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-full btn-pill bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2 transition">
            <Plus size={16} /> Add New Course
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <label className="text-sm text-gray-500 flex items-center gap-2">
            Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-gray-300 rounded-xl px-2 py-1.5 text-sm outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </label>
          <label className="text-sm text-gray-500 flex items-center gap-2">
            Search:
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-[#db254f]" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>
                {["Sr. No.", "Title", "Category", "Course Type", "Classes / Videos", "Date Created", "Students Enrolled", "Status", "Action"].map((h, i, a) => (
                  <th key={h} className={`py-3 px-4 font-semibold whitespace-nowrap ${h === "Classes / Videos" ? "min-w-[170px]" : ""} ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400">No courses found.</td></tr>
              ) : (
                shown.map((c, i) => {
                  const { date, time } = fmtDate(c.createdAt);
                  const legacyVids = c.videos || [];
                  const classes = (c.classes && c.classes.length)
                    ? c.classes
                    : (legacyVids.length ? [{ name: "Videos", videos: legacyVids, materials: c.materials || [] }] : []);
                  const classItems = classes.filter((cl) => !cl.type || cl.type === "class");
                  const quizItems = classes.filter((cl) => cl.type === "quiz");
                  const totalVideos = classes.reduce((n, cl) => n + (cl.videos?.length || 0), 0);
                  const isOpen = openVideos === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr className="hover:bg-gray-50 align-top">
                        <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                        <td className="py-3 px-4 font-medium text-gray-900 whitespace-normal max-w-[12rem]">{c.title}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                          {c.category ? <span className="text-xs px-2 py-1 rounded-md bg-rose-50 text-[#db254f] font-medium">{c.category}</span> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-500">{c.subscriptionType}</td>
                        <td className="py-3 px-4 whitespace-nowrap min-w-[150px]">
                          {classes.length > 0 ? (
                            <button type="button" onClick={() => setOpenVideos(isOpen ? null : c.id)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-rose-50 text-[#db254f] hover:bg-rose-100 transition">
                              {classItems.length} class{classItems.length !== 1 ? "es" : ""} · {totalVideos} video{totalVideos !== 1 ? "s" : ""}{quizItems.length > 0 ? ` · ${quizItems.length} quiz${quizItems.length !== 1 ? "zes" : ""}` : ""}
                              <ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">0 videos</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap"><div>{date}</div><div className="text-xs text-gray-400">{time}</div></td>
                        <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded-md font-medium bg-emerald-100 text-emerald-700">{c.enrolledCount ?? c.studentsEnrolled ?? 0}</span></td>
                        <td className="py-3 px-4"><span className={`text-xs px-2.5 py-1 rounded-md font-medium ${c.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{c.status}</span></td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => editCourse(c)} title="Edit" className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center"><Pencil size={14} /></button>
                            <button onClick={() => removeCourse(c.id)} title="Delete" className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>

                      {isOpen && classes.length > 0 && (
                        <tr className="bg-rose-50/30">
                          <td colSpan={9} className="px-4 py-3">
                            <div className="pl-6 space-y-4">
                              {classes.map((cl, cli) => cl.type === "quiz" ? (
                                <div key={cli}>
                                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 flex items-center gap-1.5 mb-2">
                                    <HelpCircle size={13} /> {cl.name || `Quiz ${cli + 1}`}
                                    <span className="text-gray-400 font-normal normal-case">· {cl.questions?.length || 0} question{(cl.questions?.length || 0) !== 1 ? "s" : ""}</span>
                                  </p>
                                  <div className="pl-4 space-y-1.5">
                                    {(cl.questions || []).map((q, qi) => (
                                      <div key={qi} className="text-sm text-gray-700">
                                        <span className="text-indigo-500 font-medium">Q{qi + 1}.</span> {q.question || "Untitled"}
                                        <span className="text-xs text-emerald-600"> — Ans: {(q.options && q.options[q.correctIndex]) || `Option ${(q.correctIndex ?? 0) + 1}`}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div key={cli}>
                                  <p className="text-xs font-bold uppercase tracking-wide text-gray-600 flex items-center gap-1.5 mb-2">
                                    <BookOpen size={13} className="text-[#db254f]" /> {cl.name || `Class ${cli + 1}`}
                                    <span className="text-gray-400 font-normal normal-case">· {cl.videos?.length || 0} video{(cl.videos?.length || 0) !== 1 ? "s" : ""}{(cl.materials?.length || 0) > 0 ? ` · ${cl.materials.length} file${cl.materials.length !== 1 ? "s" : ""}` : ""}</span>
                                  </p>
                                  <div className="pl-4 space-y-2">
                                    {(cl.videos || []).map((v, vi) => (
                                      <div key={vi} className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full btn-pill bg-[#db254f] text-white text-xs flex items-center justify-center shrink-0 mt-0.5">{vi + 1}</span>
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium text-gray-800">{v.title || "Untitled"}</div>
                                          {v.url && <a href={v.url} target="_blank" rel="noreferrer" className="text-xs text-[#db254f] hover:underline break-all">{v.url}</a>}
                                          {v.description && <div className="text-xs text-gray-500 mt-0.5">{v.description}</div>}
                                        </div>
                                      </div>
                                    ))}
                                    {(cl.materials || []).some((m) => m.data) && (
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        {cl.materials.filter((m) => m.data).map((m, mi) => (
                                          <a key={mi} href={m.data} download={m.fileName} className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-md px-2.5 py-1 text-gray-600 hover:border-[#db254f] hover:text-[#db254f]">
                                            <FileText size={12} /> {m.name || m.fileName}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-gray-500 mt-4">Showing {shown.length === 0 ? 0 : 1} to {shown.length} of {filtered.length} entries</p>
      </div>
    </AdminShell>
  );
}
