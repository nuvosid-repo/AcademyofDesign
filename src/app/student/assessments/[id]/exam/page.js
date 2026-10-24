"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  HelpCircle, FileText, CheckCircle2, ArrowRight, ArrowLeft, Clock,
  ShieldAlert, Loader2, ClipboardCheck, Ban, RefreshCw, Camera, Eye,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { uploadBlob } from "@/lib/uploadClient";
import Proctor from "@/components/exam/Proctor";

const EXAM_MINUTES = 30; // TODO: make configurable per assessment later.
const MAX_TAB_WARNINGS = 3; // after this many tab switches the exam auto-submits

const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function ExamPage() {
  const { id } = useParams();
  const router = useRouter();

  const [assessment, setAssessment] = useState(null);
  // loading | error | blocked | instructions | mcq | written | submitting | done
  const [phase, setPhase] = useState("loading");
  const [err, setErr] = useState("");

  const [mcqAnswers, setMcqAnswers] = useState({});
  const [mcqIndex, setMcqIndex] = useState(0);
  const [mcqResult, setMcqResult] = useState(null);
  const [writtenResult, setWrittenResult] = useState(null);
  const mcqSubmittedRef = useRef(false);

  const [writtenAnswers, setWrittenAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [timeLeft, setTimeLeft] = useState(EXAM_MINUTES * 60);
  const [warnings, setWarnings] = useState(0);
  const [showWarn, setShowWarn] = useState(false);
  const warnRef = useRef(0);       // authoritative warning count (no stale closures)
  const awayRef = useRef(false);   // true while the tab/window is currently not focused
  const endedRef = useRef(false);  // guards against double auto-submit
  const endFnRef = useRef(null);   // always points at the latest handleTimeout

  // ── Camera proctoring ──
  const streamRef = useRef(null);        // camera MediaStream
  const proctorRef = useRef(null);       // { stop() } exposed by <Proctor>
  const proctorFlagsRef = useRef([]);    // violation log { type, at }
  const examStartRef = useRef(0);        // ms timestamp the exam started
  const [camState, setCamState] = useState("idle"); // idle | requesting | denied
  const [toast, setToast] = useState(""); // transient on-screen proctor warning

  const inExam = phase === "mcq" || phase === "written";

  /* ── Load the assessment ── */
  useEffect(() => {
    apiFetch("/api/student/assessments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const a = (d.assessments || []).find((x) => x.id === id);
        if (!a) { setErr("Assessment not found."); setPhase("error"); return; }
        if (!a.mcqEnabled && !a.writtenEnabled) { setErr("This assessment has no written or MCQ exam."); setPhase("error"); return; }
        setAssessment(a);
        const examDone = (!a.mcqEnabled || a.mcqDone) && (!a.writtenEnabled || a.writtenSubmitted);
        setPhase(examDone ? "blocked" : "instructions");
      })
      .catch(() => { setErr("Failed to load the assessment."); setPhase("error"); });
  }, [id]);

  /* ── Countdown timer (runs only during the exam) ── */
  useEffect(() => {
    if (!inExam) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); handleTimeout(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inExam]);

  /* ── Anti-cheat: one warning per tab switch; auto-submit after MAX ──
     blur + visibilitychange both fire on a single tab switch, so we count only
     the first "leave" and reset when the student returns — no double counting. */
  useEffect(() => {
    if (!inExam) return;
    const leave = () => {
      if (awayRef.current || endedRef.current) return; // already counted / exam ending
      awayRef.current = true;
      const n = warnRef.current + 1;
      warnRef.current = n;
      setWarnings(n);
      setShowWarn(true);
      if (n >= MAX_TAB_WARNINGS) {
        endedRef.current = true;
        endFnRef.current?.(); // auto-submit the exam
      }
    };
    const back = () => { awayRef.current = false; };
    const onVis = () => (document.hidden ? leave() : back());
    window.addEventListener("blur", leave);
    window.addEventListener("focus", back);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", back);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [inExam]);

  /* ── Warn before closing/reloading during the exam ── */
  useEffect(() => {
    if (!inExam) return;
    const before = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [inExam]);

  /* ── Release the camera when leaving the exam page ── */
  useEffect(() => () => { try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ } }, []);

  /* ── Submit helpers ── */
  const submitMcq = async () => {
    if (mcqSubmittedRef.current || !assessment?.mcqEnabled) return true;
    const qs = assessment.mcqQuestions || [];
    try {
      const res = await apiFetch(`/api/student/assessments/${id}/mcq`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: qs.map((q, i) => (q.multiple ? (Array.isArray(mcqAnswers[i]) ? mcqAnswers[i] : []) : (mcqAnswers[i] ?? -1))) }),
      });
      const d = await res.json();
      if (res.ok) { mcqSubmittedRef.current = true; setMcqResult(d); return true; }
    } catch { /* noop */ }
    return false;
  };

  const submitWritten = async () => {
    if (!assessment?.writtenEnabled) return true;
    const qs = assessment.writtenQuestions || [];
    try {
      const res = await apiFetch(`/api/student/assessments/${id}/written`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: qs.map((_, i) => (writtenAnswers[i] || "")) }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setWrittenResult(d);
      return res.ok;
    } catch { return false; }
  };

  /* ── Flow transitions ── */
  // Proctoring violation → log it + show a transient on-screen warning.
  // useCallback keeps a stable identity so <Proctor>'s tracking loop isn't restarted.
  const onProctorFlag = useCallback((type) => {
    proctorFlagsRef.current.push({ type, at: examStartRef.current ? Math.round((Date.now() - examStartRef.current) / 1000) : 0 });
    const msg = type === "no_face" ? "Your face isn't visible — stay in front of the camera."
      : type === "multiple_faces" ? "Another person was detected in the camera."
      : "Please keep looking at the screen.";
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }, []);

  // Stop recording → upload the exam video → save the video URL + flags.
  const finalizeProctoring = async () => {
    try {
      const blob = await proctorRef.current?.stop?.();
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
      let videoUrl = "";
      if (blob && blob.size) videoUrl = await uploadBlob(blob, { folder: "nuvosid/exams", resourceType: "video", filename: "exam.webm" });
      await apiFetch(`/api/student/assessments/${id}/proctor`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, flags: proctorFlagsRef.current }),
      });
    } catch { /* never block exam submission on a proctoring upload issue */ }
  };

  // Start the exam — camera is required for proctoring, so request it first.
  const startExam = async () => {
    setCamState("requesting");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) { setCamState("denied"); return; }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
    } catch { setCamState("denied"); return; }
    examStartRef.current = Date.now();
    setCamState("idle");
    setPhase(assessment.mcqEnabled ? "mcq" : "written");
  };

  const afterMcq = async () => {
    setSubmitting(true);
    const ok = await submitMcq();
    setSubmitting(false);
    if (!ok) { setErr("Could not submit your MCQ answers. Please try again."); return; }
    if (assessment.writtenEnabled) setPhase("written");
    else finishAll();
  };

  const finishAll = async () => {
    setPhase("submitting");
    await submitMcq();
    await submitWritten();
    await finalizeProctoring();
    setPhase("done");
  };

  const handleTimeout = async () => {
    setPhase("submitting");
    await submitMcq();
    await submitWritten();
    await finalizeProctoring();
    setPhase("done");
  };
  endFnRef.current = handleTimeout; // keep the ref on the freshest closure (latest answers)

  const doRetry = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/student/assessments/${id}/retry`, { method: "POST" });
      if (res.ok) { if (typeof window !== "undefined") window.location.reload(); }
      else { const d = await res.json().catch(() => ({})); setErr(d.error || "Could not start the retry."); }
    } finally { setSubmitting(false); }
  };

  /* ── Shells ── */
  const Screen = ({ children, narrow }) => (
    <div className="pf-page min-h-screen w-full flex flex-col">
      <div className={`flex-1 w-full mx-auto px-4 py-6 sm:py-10 ${narrow ? "max-w-2xl" : "max-w-3xl"}`}>{children}</div>
    </div>
  );

  if (phase === "loading") return (
    <div className="pf-page min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#db254f]" size={28} /></div>
  );

  if (phase === "error") return (
    <Screen narrow>
      <div className="pf-card p-8 text-center">
        <div className="w-12 h-12 rounded-2xl pf-chip flex items-center justify-center mx-auto mb-3"><Ban size={22} /></div>
        <p className="pf-muted">{err}</p>
        <button onClick={() => router.push("/student/assessments")} className="btn-pill mt-4 inline-flex items-center gap-1.5 text-sm font-semibold border pf-border px-4 py-2 pf-hover"><ArrowLeft size={14} /> Back to Assessments</button>
      </div>
    </Screen>
  );

  if (phase === "blocked") return (
    <Screen narrow>
      <div className="pf-card p-8 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500" style={{ background: "rgba(16,185,129,0.15)" }}><CheckCircle2 size={26} /></div>
        <h2 className="text-xl font-extrabold">Exam already completed</h2>
        <p className="pf-muted mt-2 text-sm">You have already submitted this assessment. You can now proceed to the live interview from the Assessments page.</p>
        <button onClick={() => router.push("/student/assessments")} className="btn-pill mt-5 inline-flex items-center gap-1.5 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 transition"><ArrowLeft size={14} /> Back to Assessments</button>
      </div>
    </Screen>
  );

  /* ── Instructions ── */
  if (phase === "instructions") {
    const rules = [
      { icon: Clock, text: `You have ${EXAM_MINUTES} minutes to complete the exam. The timer starts as soon as you begin and cannot be paused.` },
      ...(assessment.mcqEnabled ? [{ icon: HelpCircle, text: `Section 1 — MCQ: ${assessment.mcqCount} question${assessment.mcqCount !== 1 ? "s" : ""}, one at a time. Passing score ${assessment.passingScore}%.` }] : []),
      ...(assessment.writtenEnabled ? [{ icon: FileText, text: `Section 2 — Written: ${assessment.writtenQuestions.length} question${assessment.writtenQuestions.length !== 1 ? "s" : ""}. Type your answers — copy & paste is disabled.` }] : []),
      { icon: ShieldAlert, text: "Do not switch tabs or leave this window — it is flagged, and after 3 switches your exam is submitted automatically." },
      { icon: Camera, text: "Your camera stays ON for proctoring (head & eye tracking). Sit in a well-lit place, alone, and keep looking at the screen. The session is recorded for review." },
    ];
    return (
      <Screen>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 text-white shadow-lg shadow-rose-500/30" style={{ background: "linear-gradient(135deg, #db254f, #e56b85)" }}><ClipboardCheck size={30} /></div>
          <p className="text-xs uppercase tracking-wide text-[#db254f] font-bold">{assessment.course}</p>
          <h1 className="text-2xl font-extrabold mt-1">{assessment.title}</h1>
          {assessment.description && <p className="pf-muted mt-2 text-sm max-w-xl mx-auto">{assessment.description}</p>}
        </div>
        <div className="pf-card p-6">
          <h2 className="font-bold text-lg mb-4">Exam Instructions</h2>
          <div className="space-y-3.5">
            {rules.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg pf-chip flex items-center justify-center shrink-0"><Icon size={16} className="text-[#db254f]" /></span>
                <p className="text-sm pf-muted leading-relaxed pt-1">{text}</p>
              </div>
            ))}
          </div>
          {camState === "denied" && (
            <p className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5 mt-5">Camera & microphone access is required for this exam. Please allow it in your browser (click the camera icon in the address bar), then press Start again. Use <b>Google Chrome</b> on this secure (https) site.</p>
          )}
          <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t pf-border">
            <button onClick={() => router.push("/student/assessments")} className="btn-pill inline-flex items-center gap-1.5 text-sm font-semibold border pf-border px-4 py-2 pf-hover transition"><ArrowLeft size={14} /> Cancel</button>
            <button onClick={startExam} disabled={camState === "requesting"} className="btn-pill inline-flex items-center gap-2 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-6 py-3 shadow-md shadow-rose-500/30 transition disabled:opacity-60">
              {camState === "requesting" ? <><Loader2 size={16} className="animate-spin" /> Enabling camera…</> : <>Start Exam <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  /* ── Submitting ── */
  if (phase === "submitting") return (
    <div className="pf-page min-h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin text-[#db254f]" size={30} />
      <p className="pf-muted text-sm">Submitting your exam…</p>
    </div>
  );

  /* ── Done ── */
  if (phase === "done") return (
    <Screen narrow>
      <div className="pf-card p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500" style={{ background: "rgba(16,185,129,0.15)" }}><CheckCircle2 size={30} /></div>
        <h2 className="text-2xl font-extrabold">Exam submitted 🎉</h2>
        <p className="pf-muted mt-2 text-sm">Your responses have been recorded.</p>
        <div className="grid gap-3 mt-6 text-left">
          {assessment.mcqEnabled && mcqResult && (
            <div className="rounded-xl border pf-border p-4 flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2"><HelpCircle size={15} className="text-[#db254f]" /> MCQ Score</span>
              <span className="text-lg font-extrabold">{mcqResult.percentage}% <span className="text-sm pf-muted font-medium">({mcqResult.score}/{mcqResult.total})</span></span>
            </div>
          )}
          {assessment.writtenEnabled && (
            <div className="rounded-xl border pf-border p-4 flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2"><FileText size={15} className="text-[#db254f]" /> Written Exam</span>
              {writtenResult?.aiGraded ? (
                <span className="text-sm font-bold">{writtenResult.writtenScore}/{writtenResult.writtenTotal} <span className="text-xs pf-muted font-medium">· AI graded</span></span>
              ) : (
                <span className="text-sm text-amber-500 font-medium inline-flex items-center gap-1"><Clock size={13} /> Awaiting grading</span>
              )}
            </div>
          )}
          {assessment.interviewEnabled && (
            <div className="rounded-xl p-4 text-sm pf-muted" style={{ background: "rgba(99,102,241,0.10)" }}>
              Next step: a <span className="font-semibold" style={{ color: "var(--fg)" }}>live interview</span>. Join it from the Assessments page when you are ready.
            </div>
          )}
        </div>
        {/* MCQ-only exams know pass/fail immediately → offer retry here. */}
        {assessment.mcqEnabled && !assessment.writtenEnabled && !assessment.interviewEnabled && mcqResult && !mcqResult.passed && assessment.setBEnabled && (assessment.attempt || 1) < 2 && (
          <div className="mt-5 rounded-xl p-4 text-left" style={{ background: "rgba(245,158,11,0.10)" }}>
            <p className="text-sm font-semibold text-amber-600">You didn&apos;t pass this time.</p>
            <p className="text-xs pf-muted mt-1">You get one more attempt with a different set of questions (Set B).</p>
            <button onClick={doRetry} disabled={submitting} className="btn-pill mt-3 inline-flex items-center gap-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 transition disabled:opacity-60"><RefreshCw size={15} /> {submitting ? "Starting…" : "Retry with Set B"}</button>
          </div>
        )}
        {/* When written/interview are involved, pass/fail is the combined score
            decided after grading — tell the student to check back. */}
        {(assessment.writtenEnabled || assessment.interviewEnabled) && (
          <div className="mt-5 rounded-xl p-4 text-left text-sm pf-muted" style={{ background: "rgba(var(--fg-rgb),0.04)" }}>
            Your final result is the <span className="font-semibold" style={{ color: "var(--fg)" }}>combined score</span> of all sections (pass ≥ {assessment.passingScore}%). It appears on the Assessments page once your written{assessment.interviewEnabled ? " and interview" : ""} {assessment.interviewEnabled ? "are" : "is"} graded — and you can retry with Set B there if you don&apos;t pass.
          </div>
        )}
        <button onClick={() => router.push("/student/assessments")} className="btn-pill mt-6 inline-flex items-center gap-1.5 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 transition"><ArrowLeft size={14} /> Back to Assessments</button>
      </div>
    </Screen>
  );

  /* ── Live exam (MCQ / Written) with top bar ── */
  const lowTime = timeLeft <= 120;
  return (
    <div className="pf-page min-h-screen w-full flex flex-col select-none">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b pf-border" style={{ background: "var(--bg-elev, #fff)" }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{assessment.title}</div>
            <div className="text-[11px] pf-faint">{phase === "mcq" ? "Section 1 · MCQ" : "Section 2 · Written"}</div>
          </div>
          <div className={`inline-flex items-center gap-1.5 font-bold text-sm px-3 py-1.5 rounded-full ${lowTime ? "text-white" : ""}`}
            style={lowTime ? { background: "#db254f" } : { background: "rgba(var(--fg-rgb),0.06)" }}>
            <Clock size={15} /> {fmtTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {phase === "mcq" ? (
          <McqSection assessment={assessment} answers={mcqAnswers} setAnswers={setMcqAnswers} index={mcqIndex} setIndex={setMcqIndex} onFinish={afterMcq} submitting={submitting} />
        ) : (
          <WrittenSection assessment={assessment} answers={writtenAnswers} setAnswers={setWrittenAnswers} onSubmit={finishAll} />
        )}
      </div>

      {/* Camera proctoring (head + eye tracking, recording) — corner panel */}
      {streamRef.current && (
        <Proctor stream={streamRef.current} active={inExam} startAt={examStartRef.current} onFlag={onProctorFlag} controlsRef={proctorRef} />
      )}

      {/* Live proctoring warning toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-full shadow-lg" style={{ background: "rgba(217,119,6,0.95)" }}>
          <Eye size={15} /> {toast}
        </div>
      )}

      {/* Anti-cheat warning overlay */}
      {showWarn && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="pf-card p-7 max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#db254f]" style={{ background: "rgba(219,37,79,0.12)" }}><ShieldAlert size={28} /></div>
            <h3 className="text-lg font-extrabold">{warnings >= MAX_TAB_WARNINGS ? "Exam ended" : "Warning — don't leave the exam"}</h3>
            {warnings >= MAX_TAB_WARNINGS ? (
              <p className="pf-muted text-sm mt-2">You switched away {MAX_TAB_WARNINGS} times, so your exam has been submitted automatically.</p>
            ) : (
              <p className="pf-muted text-sm mt-2">Switching tabs or leaving the exam window is not allowed. <b className="text-[#db254f]">Warning {warnings} of {MAX_TAB_WARNINGS}</b> — at {MAX_TAB_WARNINGS} your exam is submitted automatically.</p>
            )}
            {warnings < MAX_TAB_WARNINGS && (
              <button onClick={() => setShowWarn(false)} className="btn-pill mt-5 inline-flex items-center gap-1.5 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 transition">Resume Exam</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MCQ, one question at a time ── */
function McqSection({ assessment, answers, setAnswers, index, setIndex, onFinish, submitting }) {
  const qs = assessment.mcqQuestions || [];
  const total = qs.length;
  const q = qs[index];
  const isAnswered = (qi) => { const a = answers[qi]; return qs[qi]?.multiple ? (Array.isArray(a) && a.length > 0) : (a != null); };
  const answeredCount = qs.filter((_, qi) => isAnswered(qi)).length;
  const answeredCurrent = isAnswered(index);
  const isLast = index === total - 1;
  const toggleOption = (oi) => setAnswers((a) => {
    if (q.multiple) {
      const cur = Array.isArray(a[index]) ? a[index] : [];
      return { ...a, [index]: cur.includes(oi) ? cur.filter((x) => x !== oi) : [...cur, oi] };
    }
    return { ...a, [index]: oi };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-2">
          <span className="text-2xl font-extrabold text-[#db254f] leading-none">{String(index + 1).padStart(2, "0")}</span>
          <span className="pf-faint text-sm font-medium">/ {String(total).padStart(2, "0")}</span>
        </span>
        <span className="text-xs font-semibold pf-chip px-3 py-1.5 rounded-full">{answeredCount}/{total} answered</span>
      </div>
      <div className="flex gap-1.5 mb-6">
        {qs.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} aria-label={`Question ${i + 1}`} className="flex-1 h-1.5 transition-all"
            style={{ borderRadius: 9999, background: i === index ? "#db254f" : isAnswered(i) ? "rgba(219,37,79,0.45)" : "rgba(var(--fg-rgb),0.1)" }} />
        ))}
      </div>

      <p className="font-bold text-xl leading-snug mb-2">{q?.question}</p>
      {q?.multiple && <p className="text-xs font-semibold text-[#db254f] mb-2 inline-flex items-center gap-1.5"><CheckCircle2 size={13} /> Select ALL correct options</p>}
      {q?.media && (
        <div className="mb-5 mt-1">
          {q.media.startsWith("data:application/pdf") ? (
            <iframe src={`${q.media}#toolbar=0`} title="Question attachment" className="w-full h-80 rounded-xl border pf-border bg-white" />
          ) : (
            <img src={q.media} alt="Question attachment" className="max-h-80 rounded-xl border pf-border object-contain" />
          )}
        </div>
      )}
      <div className={`space-y-3 ${q?.multiple ? "" : "mt-4"}`}>
        {(q?.options || []).map((opt, oi) => {
          const active = q.multiple ? (Array.isArray(answers[index]) && answers[index].includes(oi)) : answers[index] === oi;
          return (
            <button key={oi} type="button" onClick={() => toggleOption(oi)}
              className="w-full flex items-center gap-4 border-2 px-4 py-4 text-left transition"
              style={active
                ? { borderRadius: "1rem", borderColor: "#db254f", background: "linear-gradient(90deg, rgba(219,37,79,0.14), rgba(229,107,133,0.05))" }
                : { borderRadius: "1rem", borderColor: "rgba(var(--fg-rgb),0.1)" }}>
              <span className={`w-11 h-11 flex items-center justify-center text-base font-extrabold shrink-0 transition ${active ? "text-white shadow-md shadow-rose-500/30" : "pf-faint"}`}
                style={active
                  ? { borderRadius: q.multiple ? "0.6rem" : "0.75rem", background: "linear-gradient(135deg, #db254f, #e56b85)" }
                  : { borderRadius: q.multiple ? "0.6rem" : "0.75rem", background: "rgba(var(--fg-rgb),0.06)" }}>
                {String.fromCharCode(65 + oi)}
              </span>
              <span className={`flex-1 ${active ? "font-semibold" : "font-medium"}`} style={{ color: "var(--fg)" }}>{opt}</span>
              {active && <CheckCircle2 size={22} className="text-[#db254f] shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t pf-border">
        <button onClick={() => setIndex((c) => Math.max(0, c - 1))} disabled={index === 0}
          className="btn-pill inline-flex items-center gap-1.5 text-sm font-semibold border pf-border px-4 py-2 pf-hover transition disabled:opacity-30 disabled:cursor-not-allowed"><ArrowLeft size={14} /> Back</button>
        {isLast ? (
          <button onClick={onFinish} disabled={submitting || answeredCount < total}
            className="btn-pill inline-flex items-center gap-1.5 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 shadow-md shadow-rose-500/30 transition disabled:opacity-50">
            {submitting ? "Submitting…" : (assessment.writtenEnabled ? "Continue to Written" : "Finish Exam")} <ArrowRight size={15} />
          </button>
        ) : (
          <button onClick={() => setIndex((c) => Math.min(total - 1, c + 1))} disabled={!answeredCurrent}
            className="btn-pill inline-flex items-center gap-1.5 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 shadow-md shadow-rose-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed">Next <ArrowRight size={14} /></button>
        )}
      </div>
    </div>
  );
}

/* ── Written section — type only, no copy/paste ── */
function WrittenSection({ assessment, answers, setAnswers, onSubmit }) {
  const qs = assessment.writtenQuestions || [];
  const block = (e) => e.preventDefault();
  return (
    <div>
      <div className="flex items-center gap-2 mb-1"><FileText size={18} className="text-[#db254f]" /><h2 className="font-bold text-lg">Written Exam</h2></div>
      <p className="pf-muted text-sm mb-5">Type your answers below. Copy &amp; paste is disabled — you must type your response. Your answers are graded by your instructor.</p>
      <div className="space-y-5">
        {qs.map((q, qi) => (
          <div key={qi} className="pf-card p-4">
            <p className="font-semibold text-sm mb-2.5"><span className="text-[#db254f]">Q{qi + 1}.</span> {q.question} <span className="pf-faint font-normal">({q.maxMarks} marks)</span></p>
            {q.media && (
              <div className="mb-3">
                {q.media.startsWith("data:application/pdf") ? (
                  <iframe src={`${q.media}#toolbar=0`} title="Question attachment" className="w-full h-72 rounded-xl border pf-border bg-white" />
                ) : (
                  <img src={q.media} alt="Question attachment" className="max-h-72 rounded-xl border pf-border object-contain" />
                )}
              </div>
            )}
            <textarea rows={5}
              className="w-full rounded-xl border pf-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[#db254f] resize-y select-text"
              placeholder="Type your answer here…"
              value={answers[qi] || ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [qi]: e.target.value }))}
              onPaste={block} onCopy={block} onCut={block} onDrop={block} onContextMenu={block} />
            <p className="text-[11px] pf-faint mt-1.5 inline-flex items-center gap-1"><Ban size={11} /> Copy-paste disabled</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6">
        <button onClick={onSubmit} className="btn-pill inline-flex items-center gap-2 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-6 py-3 shadow-md shadow-rose-500/30 transition">Submit Exam <CheckCircle2 size={16} /></button>
      </div>
    </div>
  );
}
