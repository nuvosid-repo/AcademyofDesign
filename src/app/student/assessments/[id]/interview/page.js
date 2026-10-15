"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Video, Mic, ArrowLeft, Loader2, CheckCircle2, Ban, Radio, Volume2, Bot, Play, PhoneOff,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const hasSTT = () => typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

// Warm-up questions the AI always asks first (admin's own questions follow).
const DEFAULT_INTRO = [
  { question: "To begin, please introduce yourself and tell us a little about your background.", maxMarks: 5 },
  { question: "What interested you in this course, and what are your career goals?", maxMarks: 5 },
  { question: "Tell us about a project or piece of work you're proud of, and your role in it.", maxMarks: 5 },
];

const SILENCE_MS = 3500;  // pause after the candidate stops talking → next question
const INITIAL_MS = 18000; // if they don't start speaking at all → move on

export default function AIInterviewPage() {
  const { id } = useParams();
  const router = useRouter();

  const [assessment, setAssessment] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading|error|ready|live|processing|done
  const [err, setErr] = useState("");
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("speaking"); // speaking|listening
  const [result, setResult] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const finalRef = useRef("");        // transcript for the current question
  const liveActiveRef = useRef(false);
  const silenceRef = useRef(null);
  const advancingRef = useRef(false);
  const stepRef = useRef(0);
  const answersRef = useRef([]);
  const questionsRef = useRef([]);

  /* ── Load ── */
  useEffect(() => {
    apiFetch("/api/student/assessments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const a = (d.assessments || []).find((x) => x.id === id);
        if (!a) { setErr("Assessment not found."); setPhase("error"); return; }
        if (!a.interviewEnabled) { setErr("This assessment has no live interview."); setPhase("error"); return; }
        const qs = [...DEFAULT_INTRO, ...(a.interviewQuestions || [])];
        questionsRef.current = qs;
        answersRef.current = new Array(qs.length).fill("");
        setAssessment(a);
        setPhase("ready");
      })
      .catch(() => { setErr("Failed to load."); setPhase("error"); });
  }, [id]);

  const questions = questionsRef.current;

  /* ── TTS (robust: never hangs even if Chrome's onend misfires) ── */
  const speak = (text) => new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    try {
      const synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === "undefined") { finish(); return; }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.pitch = 1;
      const voices = synth.getVoices();
      const en = voices.find((v) => /en[-_]/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
      if (en) u.voice = en;
      u.onend = finish; u.onerror = finish;
      synth.speak(u);
      // Chrome sometimes never fires onend — resolve after an estimated duration.
      setTimeout(finish, Math.min(22000, 1800 + text.length * 75));
    } catch { finish(); }
  });

  /* ── Silence timer → auto-advance ── */
  const clearSilence = () => { if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; } };
  const armSilence = (ms) => { clearSilence(); silenceRef.current = setTimeout(() => advance(), ms); };

  /* ── STT ── */
  const startSTT = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { armSilence(INITIAL_MS); return; }
    const rec = new SR();
    rec.lang = "en-IN"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interim += t;
      }
      // Candidate is talking → restart the silence countdown.
      if ((finalRef.current + interim).trim()) armSilence(SILENCE_MS);
    };
    rec.onend = () => { if (liveActiveRef.current) { try { rec.start(); } catch { /* noop */ } } };
    recognitionRef.current = rec;
    try { rec.start(); } catch { /* noop */ }
  };
  const stopSTT = () => { liveActiveRef.current = false; try { recognitionRef.current?.stop(); } catch { /* noop */ } };

  /* ── Ask question i: speak, then listen with auto-advance ── */
  const askQuestion = async (i) => {
    finalRef.current = "";
    setStatus("speaking");
    await speak(`Question ${i + 1}. ${questionsRef.current[i].question}`);
    if (advancingRef.current) return;
    setStatus("listening");
    liveActiveRef.current = true;
    startSTT();
    armSilence(INITIAL_MS); // give them time to start
  };

  /* ── Advance to the next question (or finish) ── */
  const advance = async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    clearSilence();
    stopSTT();
    window.speechSynthesis.cancel();
    const i = stepRef.current;
    answersRef.current[i] = (finalRef.current || "").trim();
    if (i < questionsRef.current.length - 1) {
      const ni = i + 1; stepRef.current = ni; setStep(ni);
      advancingRef.current = false;
      await askQuestion(ni);
    } else {
      await finish();
    }
  };

  /* ── Start ── */
  const begin = async () => {
    setErr("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErr("Your browser can't access the camera here. Use Google Chrome on https or localhost.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e) {
      setErr(e?.name === "NotAllowedError"
        ? "Camera & microphone permission was blocked. Allow it in the address bar and try again."
        : "Could not access camera/microphone. Please check your device and try again.");
      return;
    }
    streamRef.current = stream;
    // Recorder is best-effort — don't block the interview if it fails.
    try {
      chunksRef.current = [];
      const type = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus"
        : (MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "");
      const mr = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => setVideoUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: "video/webm" })));
      mr.start();
      recorderRef.current = mr;
    } catch { recorderRef.current = null; }
    advancingRef.current = false; stepRef.current = 0; setStep(0);
    setPhase("live"); // video element mounts now; the effect below attaches the stream
    askQuestion(0);
  };

  // Attach the camera stream once the live-room <video> is on screen.
  useEffect(() => {
    if (phase === "live" && videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  /* ── Finish → score ── */
  const finish = async () => {
    clearSilence(); stopSTT(); window.speechSynthesis.cancel();
    try { recorderRef.current?.stop(); } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    setPhase("processing");
    try {
      const res = await apiFetch(`/api/student/assessments/${id}/interview`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersRef.current, questions: questionsRef.current.map((q) => ({ question: q.question, maxMarks: q.maxMarks })) }),
      });
      const d = await res.json();
      setResult(res.ok ? d : null);
    } catch { /* noop */ }
    setPhase("done");
  };

  const endNow = () => { advancingRef.current = true; finish(); };

  useEffect(() => () => {
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    clearSilence();
  }, []);

  const Screen = ({ children }) => <div className="pf-page min-h-screen flex items-center justify-center p-4">{children}</div>;

  if (phase === "loading") return <Screen><Loader2 className="animate-spin text-[#db254f]" size={28} /></Screen>;
  if (phase === "error") return (
    <Screen>
      <div className="pf-card p-8 text-center max-w-md">
        <div className="w-12 h-12 rounded-2xl pf-chip flex items-center justify-center mx-auto mb-3"><Ban size={22} /></div>
        <p className="pf-muted">{err}</p>
        <button onClick={() => router.push("/student/assessments")} className="btn-pill mt-4 inline-flex items-center gap-1.5 text-sm font-semibold border pf-border px-4 py-2 pf-hover"><ArrowLeft size={14} /> Back</button>
      </div>
    </Screen>
  );

  /* ── Ready ── */
  if (phase === "ready") return (
    <Screen>
      <div className="pf-card p-8 max-w-lg w-full">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 text-white shadow-lg shadow-rose-500/30" style={{ background: "linear-gradient(135deg, #db254f, #e56b85)" }}><Bot size={30} /></div>
        <h1 className="text-2xl font-extrabold text-center">AI Live Interview</h1>
        <p className="pf-muted text-center mt-1 text-sm">{assessment.title} · {assessment.course}</p>
        <div className="mt-6 space-y-3 text-sm pf-muted">
          <div className="flex items-start gap-3"><span className="w-8 h-8 rounded-lg pf-chip flex items-center justify-center shrink-0"><Video size={16} className="text-[#db254f]" /></span><p className="pt-1">Your <b>camera & microphone</b> turn on — the session is recorded.</p></div>
          <div className="flex items-start gap-3"><span className="w-8 h-8 rounded-lg pf-chip flex items-center justify-center shrink-0"><Volume2 size={16} className="text-[#db254f]" /></span><p className="pt-1">The AI <b>asks each question aloud</b>. Just <b>speak your answer</b> — when you pause, the next question comes automatically.</p></div>
          <div className="flex items-start gap-3"><span className="w-8 h-8 rounded-lg pf-chip flex items-center justify-center shrink-0"><Bot size={16} className="text-[#db254f]" /></span><p className="pt-1">No buttons to press — it flows like a real interview. Scored by AI.</p></div>
        </div>
        {!hasSTT() && <p className="text-xs text-amber-500 mt-4">Tip: works best in Google Chrome.</p>}
        {err && <p className="text-sm text-rose-500 mt-4">{err}</p>}
        <div className="flex items-center justify-between gap-3 mt-6">
          <button onClick={() => router.push("/student/assessments")} className="btn-pill inline-flex items-center gap-1.5 text-sm font-semibold border pf-border px-4 py-2 pf-hover"><ArrowLeft size={14} /> Cancel</button>
          <button onClick={begin} className="btn-pill inline-flex items-center gap-2 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-6 py-3 shadow-md shadow-rose-500/30 transition"><Play size={16} fill="currentColor" /> Start Interview</button>
        </div>
      </div>
    </Screen>
  );

  if (phase === "processing") return <Screen><div className="flex flex-col items-center gap-3"><Loader2 className="animate-spin text-[#db254f]" size={30} /><p className="pf-muted text-sm">Scoring your interview…</p></div></Screen>;

  /* ── Done ── */
  if (phase === "done") return (
    <div className="pf-page min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="pf-card p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500" style={{ background: "rgba(16,185,129,0.15)" }}><CheckCircle2 size={30} /></div>
          <h2 className="text-2xl font-extrabold">Interview complete 🎉</h2>
          <p className="pf-muted mt-2 text-sm">Your responses were recorded and {result?.graded ? "scored by AI" : "submitted"}.</p>
          {result?.graded && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full" style={{ background: "rgba(219,37,79,0.1)" }}>
              <Bot size={16} className="text-[#db254f]" /> <span className="font-bold">AI Interview score: {result.interviewScore}/{result.interviewTotal}</span>
            </div>
          )}
          {videoUrl && (
            <div className="mt-6 text-left">
              <div className="text-xs font-bold uppercase tracking-wide pf-faint mb-2 flex items-center gap-1.5"><Video size={13} className="text-[#db254f]" /> Your recording</div>
              <video src={videoUrl} controls className="w-full rounded-xl border pf-border bg-black" />
              <p className="text-[11px] pf-faint mt-1.5">In the full version this uploads to the admin panel for review.</p>
            </div>
          )}
          {result?.breakdown?.length > 0 && (
            <div className="mt-6 text-left space-y-2">
              <div className="text-xs font-bold uppercase tracking-wide pf-faint mb-1">Breakdown</div>
              {result.breakdown.map((b, i) => (
                <div key={i} className="rounded-xl border pf-border p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold truncate">Q{i + 1}. {b.question}</span><span className="text-sm font-bold shrink-0">{b.marks}/{b.maxMarks}</span></div>
                  {b.feedback && <p className="text-xs pf-muted mt-1"><b>AI:</b> {b.feedback}</p>}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => router.push("/student/assessments")} className="btn-pill mt-6 inline-flex items-center gap-1.5 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 transition"><ArrowLeft size={14} /> Back to Assessments</button>
        </div>
      </div>
    </div>
  );

  /* ── Live interview — immersive panel, voice only (no question text) ── */
  const listening = status === "listening";
  return (
    <div className="pf-page min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b pf-border">
        <span className="font-bold flex items-center gap-2 text-sm"><Bot size={17} className="text-[#db254f]" /> AI Live Interview</span>
        <div className="flex items-center gap-4">
          <span className="text-xs pf-faint">Question {step + 1} of {questions.length}</span>
          <button onClick={endNow} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-full px-3.5 py-1.5 transition"><PhoneOff size={13} /> End</button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1 px-5 pt-3">
        {questions.map((_, i) => <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i < step ? "#10b981" : i === step ? "#db254f" : "rgba(var(--fg-rgb),0.12)" }} />)}
      </div>

      {/* Stage */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl aspect-video rounded-3xl overflow-hidden border pf-border bg-black shadow-2xl">
          <video ref={videoRef} className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} playsInline />

          {/* REC */}
          <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white px-2.5 py-1 rounded-full" style={{ background: "rgba(220,38,38,0.85)" }}><Radio size={12} /> REC</div>

          {/* AI orb — top right */}
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
            <span className={`relative flex items-center justify-center w-7 h-7 rounded-full text-white ${!listening ? "animate-pulse" : ""}`} style={{ background: "linear-gradient(135deg,#db254f,#e56b85)" }}><Bot size={15} /></span>
            <span className="text-xs font-semibold text-white">AI Interviewer</span>
          </div>

          {/* Bottom status overlay */}
          <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col items-center gap-3" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
            {/* Waveform */}
            <div className="flex items-end justify-center gap-1.5 h-10">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span key={i} className="w-1.5 rounded-full" style={{
                  height: listening ? [16, 30, 22, 36, 20, 32, 14][i] : 8,
                  background: listening ? "#34d399" : "rgba(255,255,255,0.5)",
                  animation: listening ? `aiwave 0.85s ${i * 0.1}s ease-in-out infinite` : (!listening ? `aiwave 1.1s ${i * 0.1}s ease-in-out infinite` : "none"),
                }} />
              ))}
            </div>
            <div className={`inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-full ${listening ? "bg-emerald-600/90" : "bg-[#db254f]/90"}`}>
              {listening
                ? <><Mic size={15} /> Your turn — speak your answer</>
                : <><Volume2 size={15} /> AI is asking the question…</>}
            </div>
            <p className="text-[11px] text-white/70">{listening ? "Pause when you're done — the next question starts automatically." : "Listen to the question, then answer aloud."}</p>
          </div>
        </div>
      </div>

      <style>{`@keyframes aiwave{0%,100%{transform:scaleY(0.4)}50%{transform:scaleY(1)}}`}</style>
    </div>
  );
}
