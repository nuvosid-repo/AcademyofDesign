"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, BookOpen, PlayCircle, FileText, HelpCircle, ChevronDown, Clock,
  Users, Download, CheckCircle2, Video as VideoIcon, Lock, Check, Eye, X, Loader2,
  Play, Pause, SkipForward, SkipBack, Zap, Box, ExternalLink,
} from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { apiFetch } from "@/lib/api";

// Only Excel/CSV spreadsheets are downloadable; other materials are view-only.
const isExcelFile = (m) => {
  const name = (m.fileName || m.name || "").toLowerCase();
  const type = (m.type || "").toLowerCase();
  return /\.(xlsx?|csv)$/.test(name) || type.includes("spreadsheet") || type.includes("excel") || type === "text/csv";
};

/* Lazy-load the YouTube IFrame API once (needed to detect when a video ends). */
let ytPromise;
function loadYT() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!ytPromise) {
    ytPromise = new Promise((resolve) => {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      document.body.appendChild(tag);
    });
  }
  return ytPromise;
}

/* Lazy-load the Vimeo Player SDK once (to detect the 'ended' event). */
let vimeoPromise;
function loadVimeo() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Vimeo && window.Vimeo.Player) return Promise.resolve(window.Vimeo);
  if (!vimeoPromise) {
    vimeoPromise = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://player.vimeo.com/api/player.js";
      s.onload = () => resolve(window.Vimeo);
      document.body.appendChild(s);
    });
  }
  return vimeoPromise;
}

/* Embeddable player that reports completion via onComplete only once the
   viewer has watched the whole video (YouTube/Vimeo 'ended' or <video> end). */
function VideoEmbed({ url, title, onComplete, controlsRef, onPlayState }) {
  const yt = url ? url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/) : null;
  const vimeo = url ? url.match(/vimeo\.com\/(\d+)/) : null;
  const isFile = /\.(mp4|webm|ogg)(\?|$)/i.test(url || "");
  const box = "w-full aspect-video rounded-xl overflow-hidden border pf-border bg-black";

  const mountRef = useRef(null);
  const videoRef = useRef(null);
  const doneRef = useRef(false);
  // Keep the latest callbacks so player event handlers never fire a stale one.
  const cbRef = useRef(onComplete);
  const psRef = useRef(onPlayState);
  useEffect(() => { cbRef.current = onComplete; psRef.current = onPlayState; });
  const fire = () => { if (!doneRef.current) { doneRef.current = true; cbRef.current?.(); } };
  const setControls = (c) => { if (controlsRef) controlsRef.current = c; };

  // YouTube — needs the IFrame API for end-detection + external play/pause.
  useEffect(() => {
    if (!yt) return;
    let player, cancelled = false;
    loadYT().then((YT) => {
      if (cancelled || !YT || !mountRef.current) return;
      player = new YT.Player(mountRef.current, {
        width: "100%", height: "100%", videoId: yt[1],
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => { if (e.data === 0) fire(); psRef.current?.(e.data === 1); },
        },
      });
      setControls({ play: () => { try { player.playVideo(); } catch { /* noop */ } }, pause: () => { try { player.pauseVideo(); } catch { /* noop */ } } });
    });
    return () => { cancelled = true; setControls(null); try { player?.destroy?.(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Vimeo — attach the SDK to the iframe for 'ended' + play/pause.
  useEffect(() => {
    if (!vimeo) return;
    let player, cancelled = false;
    loadVimeo().then((V) => {
      if (cancelled || !V || !mountRef.current) return;
      player = new V.Player(mountRef.current);
      player.on("ended", fire);
      player.on("play", () => psRef.current?.(true));
      player.on("pause", () => psRef.current?.(false));
      setControls({ play: () => { try { player.play(); } catch { /* noop */ } }, pause: () => { try { player.pause(); } catch { /* noop */ } } });
    });
    return () => { cancelled = true; setControls(null); try { player?.off?.("ended"); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // HTML5 <video> — wire external controls to the element.
  useEffect(() => {
    if (!isFile) return;
    setControls({ play: () => videoRef.current?.play(), pause: () => videoRef.current?.pause() });
    return () => setControls(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!url) return null;
  if (yt) return <div className={box}><div ref={mountRef} className="w-full h-full" /></div>;
  if (vimeo) return <div className={box}><iframe ref={mountRef} src={`https://player.vimeo.com/video/${vimeo[1]}`} title={title} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>;
  if (isFile) return <div className={box}><video ref={videoRef} src={url} controls className="w-full h-full" onEnded={fire} onPlay={() => psRef.current?.(true)} onPause={() => psRef.current?.(false)} /></div>;
  // Non-embeddable link: can't track playback, so count opening it as viewed.
  return <a href={url} target="_blank" rel="noreferrer" onClick={fire} className="inline-flex items-center gap-1.5 text-sm text-[#db254f] hover:underline"><PlayCircle size={15} /> Open video</a>;
}

/* Interactive MCQ quiz — modern exam-style, one question at a time. */
function QuizPlayer({ courseId, quiz }) {
  const [answers, setAnswers] = useState({});
  const [cur, setCur] = useState(0);
  const [started, setStarted] = useState(false);
  // If the student already attempted this quiz, show their saved score first.
  const [result, setResult] = useState(quiz.lastResult || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const total = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;

  const submit = async () => {
    if (answeredCount < total) { setError("Please answer all questions before submitting."); return; }
    setError(""); setSubmitting(true);
    try {
      const ans = quiz.questions.map((_, i) => (answers[i] ?? -1));
      const res = await apiFetch(`/api/student/courses/${courseId}/quiz`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizIndex: quiz.index, answers: ans }),
      });
      const d = await res.json();
      if (res.ok) setResult(d); else setError(d.error || "Failed to submit");
    } finally { setSubmitting(false); }
  };

  /* ── Result screen (final — one attempt only) ── */
  if (result) {
    return (
      <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(160deg, rgba(219,37,79,0.10), transparent 55%)" }}>
        <div className="flex flex-col items-center text-center px-6 py-12">
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center mb-5 ${result.passed ? "text-emerald-500" : "text-[#db254f]"}`}
            style={{ background: `conic-gradient(currentColor ${result.percentage * 3.6}deg, rgba(var(--fg-rgb),0.1) 0deg)` }}>
            <div className="w-24 h-24 rounded-full pf-card flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold leading-none">{result.percentage}<span className="text-lg">%</span></span>
            </div>
          </div>
          <h3 className="text-2xl font-extrabold">{result.passed ? "Great job! 🎉" : "Nice try!"}</h3>
          <p className="pf-muted mt-1.5">You got <span className="font-bold" style={{ color: "var(--fg)" }}>{result.score}</span> of <span className="font-bold" style={{ color: "var(--fg)" }}>{result.total}</span> questions correct.</p>
          <div className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full mt-4 ${result.passed ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-[#db254f]"}`}>
            <CheckCircle2 size={15} /> {result.passed ? "Passed" : "Keep practising"}
          </div>
          <p className="text-xs pf-faint" style={{ marginTop: "1.5rem" }}>You have already completed this quiz. Scores are final.</p>
        </div>
      </div>
    );
  }

  /* ── Start screen ── */
  if (!started) {
    return (
      <div className="rounded-3xl text-center px-6 py-10" style={{ background: "linear-gradient(160deg, rgba(219,37,79,0.10), transparent 55%)" }}>
        <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-5 text-white shadow-lg shadow-rose-500/30" style={{ background: "linear-gradient(135deg, #db254f, #e56b85)" }}>
          <HelpCircle size={34} />
        </div>
        <h3 className="text-2xl font-extrabold">{quiz.name}</h3>
        <p className="pf-muted mt-2 max-w-sm mx-auto">Answer all questions to complete this quiz. Your score is saved automatically.</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className="inline-flex items-center gap-2 text-sm font-semibold pf-card px-4 py-2 rounded-full"><HelpCircle size={15} className="text-[#db254f]" /> {total} Question{total !== 1 ? "s" : ""}</span>
          <span className="inline-flex items-center gap-2 text-sm font-semibold pf-card px-4 py-2 rounded-full"><CheckCircle2 size={15} className="text-[#db254f]" /> Pass 50%</span>
        </div>
        <button onClick={() => setStarted(true)} style={{ marginTop: "1.75rem" }} className="btn-pill inline-flex items-center gap-2 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-6 py-3 shadow-md shadow-rose-500/30 transition">
          Start Quiz <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  /* ── Question screen ── */
  const q = quiz.questions[cur];
  const answeredCurrent = answers[cur] != null;
  const isLast = cur === total - 1;

  return (
    <div>
      {/* Segmented progress */}
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-2">
          <span className="text-2xl font-extrabold text-[#db254f] leading-none">{String(cur + 1).padStart(2, "0")}</span>
          <span className="pf-faint text-sm font-medium">/ {String(total).padStart(2, "0")}</span>
        </span>
        <span className="text-xs font-semibold pf-chip px-3 py-1.5 rounded-full">{answeredCount}/{total} answered</span>
      </div>
      <div className="flex gap-1.5 mb-6">
        {quiz.questions.map((_, i) => (
          <button key={i} onClick={() => setCur(i)} aria-label={`Question ${i + 1}`}
            className="flex-1 h-1.5 transition-all"
            style={{ borderRadius: 9999, background: i === cur ? "#db254f" : answers[i] != null ? "rgba(219,37,79,0.45)" : "rgba(var(--fg-rgb),0.1)" }} />
        ))}
      </div>

      {/* Question + options */}
      <div key={cur} className="quiz-fade">
        <p className="font-bold text-xl leading-snug mb-6">{q.question}</p>
        <div className="space-y-3">
          {q.options.map((opt, oi) => {
            const active = answers[cur] === oi;
            return (
              <button key={oi} type="button" onClick={() => setAnswers((a) => ({ ...a, [cur]: oi }))}
                className="w-full flex items-center gap-4 border-2 px-4 py-4 text-left transition"
                style={active
                  ? { borderRadius: "1rem", borderColor: "#db254f", background: "linear-gradient(90deg, rgba(219,37,79,0.14), rgba(229,107,133,0.05))" }
                  : { borderRadius: "1rem", borderColor: "rgba(var(--fg-rgb),0.1)" }}>
                <span className={`w-11 h-11 flex items-center justify-center text-base font-extrabold shrink-0 transition ${active ? "text-white shadow-md shadow-rose-500/30" : "pf-faint"}`}
                  style={active ? { borderRadius: "0.75rem", background: "linear-gradient(135deg, #db254f, #e56b85)" } : { borderRadius: "0.75rem", background: "rgba(var(--fg-rgb),0.06)" }}>
                  {String.fromCharCode(65 + oi)}
                </span>
                <span className={`flex-1 ${active ? "font-semibold" : "font-medium"}`} style={{ color: "var(--fg)" }}>{opt}</span>
                {active && <CheckCircle2 size={22} className="text-[#db254f] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-rose-500 mt-4 text-center">{error}</p>}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t pf-border">
        <button onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0}
          className="btn-pill inline-flex items-center gap-1.5 text-sm font-semibold border pf-border px-4 py-2 pf-hover transition disabled:opacity-30 disabled:cursor-not-allowed">
          <ArrowLeft size={14} /> Back
        </button>

        {isLast ? (
          <button onClick={submit} disabled={submitting || answeredCount < total}
            className="btn-pill inline-flex items-center gap-1.5 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 shadow-md shadow-rose-500/30 transition disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit Quiz"} <CheckCircle2 size={15} />
          </button>
        ) : (
          <button onClick={() => setCur((c) => Math.min(total - 1, c + 1))} disabled={!answeredCurrent}
            className="btn-pill inline-flex items-center gap-1.5 text-sm font-semibold bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 shadow-md shadow-rose-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed">
            Next <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function CourseLearningPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openIdx, setOpenIdx] = useState(0);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [completed, setCompleted] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [viewMat, setViewMat] = useState(null); // study material open in the viewer modal
  const [viewUrl, setViewUrl] = useState("");    // object URL of the fetched material
  const [viewErr, setViewErr] = useState("");
  const [isPlaying, setIsPlaying] = useState(false); // current player state (for quick-action play/pause)
  const playerControls = useRef(null);               // { play, pause } exposed by VideoEmbed

  useEffect(() => {
    apiFetch(`/api/student/courses/${id}`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => {
        setData(d);
        setCompleted(new Set(d.progress?.completedVideos || []));
        // Auto-select the first available video for the player.
        for (const item of d.curriculum || []) {
          if (item.type !== "quiz" && item.videos?.length) {
            const v = item.videos[0];
            setCurrentVideo({ ci: item.index, vi: 0, url: v.url, title: v.title, description: v.description, className: item.name });
            break;
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const playVideo = (item, vi) => {
    const v = item.videos[vi];
    setIsPlaying(false);
    setCurrentVideo({ ci: item.index, vi, url: v.url, title: v.title, description: v.description, className: item.name });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const togglePlay = () => { const c = playerControls.current; if (!c) return; isPlaying ? c.pause?.() : c.play?.(); };

  const markComplete = async () => {
    if (!currentVideo) return;
    const key = `${currentVideo.ci}:${currentVideo.vi}`;
    if (completed.has(key) || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/student/courses/${id}/progress`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classIndex: currentVideo.ci, videoIndex: currentVideo.vi }),
      });
      const d = await res.json();
      if (res.ok) setCompleted(new Set(d.completedVideos || []));
    } finally { setSaving(false); }
  };

  // Fetch a material WITH the student's auth token (apiFetch sends the bearer),
  // so it works regardless of cookies. View-only → object URL in the modal;
  // Excel → trigger a download.
  const openMaterial = async (m) => {
    setViewMat(m); setViewUrl(""); setViewErr("");
    try {
      const res = await apiFetch(m.url);
      if (!res.ok) { setViewErr("Could not load this material."); return; }
      const blob = await res.blob();
      setViewUrl(URL.createObjectURL(blob));
    } catch { setViewErr("Could not load this material."); }
  };
  const closeMaterial = () => {
    if (viewUrl) { try { URL.revokeObjectURL(viewUrl); } catch { /* noop */ } }
    setViewUrl(""); setViewMat(null); setViewErr("");
  };
  const downloadMaterial = async (m) => {
    try {
      const res = await apiFetch(m.url);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = m.name || m.fileName || "file";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* noop */ }
  };

  if (loading) return <StudentShell subtitle="Course"><p className="pf-muted">Loading course…</p></StudentShell>;
  if (error) return (
    <StudentShell subtitle="Course">
      <div className="pf-card p-8 text-center">
        <p className="pf-muted">{error}</p>
        <Link href="/student/my-courses" className="inline-flex items-center gap-1.5 text-[#db254f] hover:underline mt-3 text-sm"><ArrowLeft size={14} /> Back to My Courses</Link>
      </div>
    </StudentShell>
  );

  const { course, curriculum } = data;
  const classCount = curriculum.filter((c) => c.type === "class").length;
  const quizCount = curriculum.filter((c) => c.type === "quiz").length;
  const videoCount = curriculum.reduce((n, c) => n + (c.videos?.length || 0), 0);

  /* ── Progressive (drip) unlock logic ── */
  const classComplete = (cls) => (cls.videos || []).every((_, vi) => completed.has(`${cls.index}:${vi}`));
  const prevClassOf = (i) => { for (let k = i - 1; k >= 0; k--) { if (curriculum[k].type !== "quiz") return curriculum[k]; } return null; };
  // A class/quiz item unlocks once the nearest preceding class is fully watched.
  const itemUnlocked = (i) => { const pc = prevClassOf(i); return !pc || classComplete(pc); };
  // Within an unlocked class, a lecture unlocks once the previous one is done.
  const videoUnlocked = (cls, vi) => vi === 0 || completed.has(`${cls.index}:${vi - 1}`);
  const curVideoDone = currentVideo && completed.has(`${currentVideo.ci}:${currentVideo.vi}`);

  /* ── Quick-action: flat video order (prev/next) + overall progress ── */
  const flatVideos = [];
  curriculum.forEach((item) => { if (item.type !== "quiz") (item.videos || []).forEach((v, vi) => flatVideos.push({ ci: item.index, vi, item, v })); });
  const curFlat = flatVideos.findIndex((f) => currentVideo && f.ci === currentVideo.ci && f.vi === currentVideo.vi);
  const prevV = curFlat > 0 ? flatVideos[curFlat - 1] : null;
  const nextV = curFlat >= 0 && curFlat < flatVideos.length - 1 ? flatVideos[curFlat + 1] : null;
  const nextUnlocked = nextV && itemUnlocked(nextV.ci) && videoUnlocked(nextV.item, nextV.vi);
  const totalVideos = flatVideos.length;
  const doneVideos = flatVideos.filter((f) => completed.has(`${f.ci}:${f.vi}`)).length;
  const progressPct = totalVideos ? Math.round((doneVideos / totalVideos) * 100) : 0;
  // Study materials of the class the current video belongs to.
  const curClass = currentVideo ? curriculum.find((c) => c.type !== "quiz" && c.index === currentVideo.ci) : null;
  const curMaterials = curClass?.materials || [];

  return (
    <StudentShell subtitle="Course">
      <Link href="/student/my-courses" className="inline-flex items-center gap-1.5 pf-muted hover:text-[#db254f] text-sm mb-4"><ArrowLeft size={15} /> Back to My Courses</Link>

      {/* ── Course heading (above the video) ── */}
      <div className="mb-5">
        {course.category && <span className="text-xs uppercase tracking-wide text-[#db254f] font-bold">{course.category}</span>}
        <h1 className="font-extrabold text-2xl md:text-3xl leading-tight mt-1">{course.title}</h1>
        {course.description && <p className="pf-muted mt-2 text-sm leading-relaxed">{course.description}</p>}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm">
          <span className="inline-flex items-center gap-1.5 pf-muted"><BookOpen size={15} className="text-[#db254f]" /> {classCount} class{classCount !== 1 ? "es" : ""}</span>
          <span className="inline-flex items-center gap-1.5 pf-muted"><VideoIcon size={15} className="text-[#db254f]" /> {videoCount} video{videoCount !== 1 ? "s" : ""}</span>
          {quizCount > 0 && <span className="inline-flex items-center gap-1.5 pf-muted"><HelpCircle size={15} className="text-[#db254f]" /> {quizCount} quiz{quizCount !== 1 ? "zes" : ""}</span>}
          {course.duration && <span className="inline-flex items-center gap-1.5 pf-muted"><Clock size={15} className="text-[#db254f]" /> {course.duration}</span>}
          {course.instructors?.length > 0 && <span className="inline-flex items-center gap-1.5 pf-muted"><Users size={15} className="text-[#db254f]" /> {course.instructors.join(", ")}</span>}
        </div>
      </div>

      {/* ── Player (left) + Quick Action panel (right) ── */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Player */}
        <div className="lg:col-span-2">
          {currentVideo?.url ? (
            <>
              <VideoEmbed key={currentVideo.url} url={currentVideo.url} title={currentVideo.title} onComplete={markComplete} controlsRef={playerControls} onPlayState={setIsPlaying} />
              <div className="mt-4">
                <div className="float-right ml-4 mb-1">
                  {curVideoDone ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-500 bg-emerald-500/12 px-3.5 py-2 rounded-full">
                      <CheckCircle2 size={16} /> Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium pf-faint px-3 py-2 rounded-full" style={{ background: "rgba(var(--fg-rgb),0.05)" }}>
                      {saving ? "Saving…" : "Watch fully to unlock next"}
                    </span>
                  )}
                </div>
                <span className="text-xs uppercase tracking-wide text-[#db254f] font-semibold">{currentVideo.className}</span>
                <h2 className="font-bold text-xl mt-1" style={{ marginTop: "0.25rem", marginBottom: 0 }}>{currentVideo.title || "Untitled video"}</h2>
                {currentVideo.description && <p className="pf-muted text-sm mt-2 leading-relaxed clear-both text-justify">{currentVideo.description}</p>}
              </div>
            </>
          ) : (
            <div className="pf-card w-full aspect-video flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-2xl pf-chip flex items-center justify-center mb-3"><PlayCircle size={26} /></div>
              <p className="pf-muted text-sm">No videos in this course yet.</p>
            </div>
          )}
        </div>

        {/* Quick Action panel */}
        <aside className="pf-card p-5 lg:sticky lg:top-4">
          <h3 className="font-bold flex items-center gap-2 mb-4"><Zap size={17} className="text-[#db254f]" /> Quick Actions</h3>

          {/* Course progress */}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="pf-muted">Course progress</span>
            <span className="font-extrabold" style={{ color: progressPct >= 100 ? "#10b981" : "#db254f" }}>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(var(--fg-rgb),0.1)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: progressPct >= 100 ? "#10b981" : "#db254f" }} />
          </div>
          <p className="text-[11px] pf-faint mt-1.5">{doneVideos} of {totalVideos} lesson{totalVideos !== 1 ? "s" : ""} completed</p>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-4 mt-5 py-3.5 rounded-2xl" style={{ background: "rgba(var(--fg-rgb),0.04)" }}>
            <button onClick={() => prevV && playVideo(prevV.item, prevV.vi)} disabled={!prevV} title="Previous lesson"
              className="btn-pill w-12 h-12 border pf-border flex items-center justify-center pf-muted hover:text-[#db254f] pf-hover transition disabled:opacity-25 disabled:cursor-not-allowed"><SkipBack size={18} fill="currentColor" /></button>
            <button onClick={togglePlay} disabled={!currentVideo} title={isPlaying ? "Pause" : "Play"}
              className="btn-pill w-16 h-16 text-white flex items-center justify-center shadow-xl shadow-rose-500/40 hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #db254f, #e56b85)" }}>
              {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={() => nextUnlocked && playVideo(nextV.item, nextV.vi)} disabled={!nextUnlocked} title={nextV && !nextUnlocked ? "Complete current lesson first" : "Next lesson"}
              className="btn-pill w-12 h-12 border pf-border flex items-center justify-center pf-muted hover:text-[#db254f] pf-hover transition disabled:opacity-25 disabled:cursor-not-allowed">
              {nextV && !nextUnlocked ? <Lock size={16} /> : <SkipForward size={18} fill="currentColor" />}
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] pf-faint mt-2.5 px-1">
            <span>{prevV ? "Previous" : " "}</span>
            <span className="font-semibold pf-muted">{curFlat >= 0 ? `Lesson ${curFlat + 1} / ${totalVideos}` : ""}</span>
            <span>{nextUnlocked ? "Next" : (nextV ? "Locked" : " ")}</span>
          </div>

          {/* Study materials of the current class */}
          <div className="mt-5 pt-4 border-t pf-border">
            <div className="text-[11px] font-bold uppercase tracking-wide pf-faint mb-2.5 flex items-center gap-1.5"><FileText size={13} className="text-[#db254f]" /> Study Materials</div>
            {curMaterials.length === 0 ? (
              <p className="pf-faint text-sm">No materials for this lesson.</p>
            ) : (
              <div className="space-y-2">
                {curMaterials.map((m, mi) => {
                  const excel = isExcelFile(m);
                  return (
                    <button key={mi} type="button" onClick={() => (excel ? downloadMaterial(m) : openMaterial(m))} title={excel ? "Download" : "View"}
                      className="group w-full flex items-center gap-3 rounded-xl p-2.5 pf-hover transition text-left" style={{ background: "rgba(var(--fg-rgb),0.04)" }}>
                      <span className="w-9 h-9 rounded-lg pf-chip flex items-center justify-center shrink-0"><FileText size={16} className="text-[#db254f]" /></span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{m.name || m.fileName || "File"}</div>
                        <div className="text-[11px] pf-faint">{excel ? "Excel · download" : "View only"}</div>
                      </div>
                      {excel ? <Download size={15} className="pf-faint group-hover:text-[#db254f] shrink-0 transition" /> : <Eye size={15} className="pf-faint group-hover:text-[#db254f] shrink-0 transition" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3D Model for the current class (opens an interactive preview in a new tab) */}
          {curClass?.has3dModel && (
            <div className="mt-5 pt-4 border-t pf-border">
              <div className="text-[11px] font-bold uppercase tracking-wide pf-faint mb-2.5 flex items-center gap-1.5"><Box size={13} className="text-[#db254f]" /> 3D Model</div>
              <a href={`/student/courses/${id}/model?ci=${curClass.index}`} target="_blank" rel="noopener noreferrer"
                className="group w-full flex items-center gap-3 rounded-xl p-2.5 transition text-left" style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-indigo-500" style={{ background: "rgba(99,102,241,0.18)" }}><Box size={16} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">Show 3D Model</div>
                  <div className="text-[11px] pf-faint">Interactive preview · opens in a new tab</div>
                </div>
                <ExternalLink size={15} className="pf-faint group-hover:text-indigo-500 shrink-0 transition" />
              </a>
            </div>
          )}
        </aside>
      </div>

      {/* ── Curriculum ── */}
      <h2 className="text-xl font-bold" style={{ marginTop: "2.5rem", marginBottom: "1rem" }}>Course Content</h2>
      {curriculum.length === 0 ? (
        <div className="pf-card p-8 text-center pf-muted">No content added to this course yet.</div>
      ) : (
        <div className="space-y-3">
          {curriculum.map((item, i) => {
            const isOpen = openIdx === i;
            const isQuiz = item.type === "quiz";
            const classNo = curriculum.slice(0, i + 1).filter((c) => c.type !== "quiz").length;
            const locked = !itemUnlocked(i);
            const done = isQuiz ? !!item.lastResult : ((item.videos || []).length > 0 && classComplete(item));
            const vidTotal = isQuiz ? 0 : (item.videos || []).length;
            const vidDone = isQuiz ? 0 : (item.videos || []).filter((_, vi) => completed.has(`${item.index}:${vi}`)).length;
            const pct = vidTotal ? Math.round((vidDone / vidTotal) * 100) : 0;
            const badgeCls = isQuiz && !locked && !done ? "text-white" : (!done && !locked ? "pf-chip" : "");
            const badgeStyle = done ? { background: "rgba(16,185,129,0.15)", color: "#10b981" }
              : locked ? { background: "rgba(var(--fg-rgb),0.06)", color: "rgba(var(--fg-rgb),0.5)" }
              : isQuiz ? { background: "linear-gradient(135deg, #db254f, #e56b85)" } : undefined;
            return (
              <div key={i} className={`pf-card overflow-hidden ${locked ? "opacity-75" : ""}`}>
                <button onClick={() => { if (!locked) setOpenIdx(isOpen ? -1 : i); }}
                  className={`w-full flex items-center gap-3.5 p-4 text-left transition ${locked ? "cursor-not-allowed" : "pf-hover"}`}>
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${badgeCls}`} style={badgeStyle}>
                    {locked ? <Lock size={16} /> : done ? <CheckCircle2 size={18} /> : isQuiz ? <HelpCircle size={18} /> : String(classNo).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{item.name}</div>
                    <div className="text-xs pf-faint mt-0.5 flex items-center gap-2">
                      {isQuiz ? (
                        <span className="inline-flex items-center gap-1"><HelpCircle size={12} /> {item.questionCount} question{item.questionCount !== 1 ? "s" : ""}</span>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1"><VideoIcon size={12} /> {item.videos?.length || 0}</span>
                          {item.materials?.length > 0 && <span className="inline-flex items-center gap-1"><FileText size={12} /> {item.materials.length}</span>}
                        </>
                      )}
                    </div>
                    {!isQuiz && !locked && vidTotal > 0 && (
                      <div className="mt-2 flex items-center gap-2 max-w-md">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(var(--fg-rgb),0.1)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: done ? "#10b981" : "#db254f" }} />
                        </div>
                        <span className="text-[11px] font-semibold shrink-0" style={done ? { color: "#10b981" } : undefined}>
                          {vidDone}/{vidTotal} · {done ? "Completed" : `${pct}%`}
                        </span>
                      </div>
                    )}
                  </div>
                  {locked ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold pf-faint shrink-0"><Lock size={13} /> <span className="hidden sm:inline">Locked</span></span>
                  ) : (
                    <>
                      {done && <span className="text-[11px] font-bold text-emerald-500 hidden sm:block">Completed</span>}
                      {isQuiz && !done && <span className="text-[11px] font-bold uppercase tracking-wide text-[#db254f] bg-rose-500/10 px-2.5 py-1 rounded-full hidden sm:block">Quiz</span>}
                      <ChevronDown size={18} className={`pf-faint transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                    </>
                  )}
                </button>

                {isOpen && !locked && (
                  <div className="border-t pf-border">
                    {isQuiz ? (
                      <div className="p-4 sm:p-5">
                        {item.questionCount > 0
                          ? <QuizPlayer courseId={course.id} quiz={item} />
                          : <p className="pf-muted text-sm">This quiz has no questions yet.</p>}
                      </div>
                    ) : (item.videos || []).length === 0 && (item.materials || []).length === 0 ? (
                      <p className="pf-muted text-sm p-5">No content in this class yet.</p>
                    ) : (
                      /* Lectures (left) · Study materials (right) */
                      <div className="grid md:grid-cols-3 gap-5 p-4 sm:p-5">
                        {/* Left: lecture list */}
                        <div className="md:col-span-2">
                          <div className="text-[11px] font-bold uppercase tracking-wide pf-faint mb-2.5 flex items-center gap-1.5"><VideoIcon size={13} className="text-[#db254f]" /> Lectures</div>
                          {(item.videos || []).length === 0 ? (
                            <p className="pf-muted text-sm">No lectures in this class yet.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {item.videos.map((v, vi) => {
                                const active = currentVideo?.ci === item.index && currentVideo?.vi === vi;
                                const vLocked = !videoUnlocked(item, vi);
                                const vDone = completed.has(`${item.index}:${vi}`);
                                if (vLocked) {
                                  return (
                                    <div key={vi} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 opacity-60 cursor-not-allowed" title="Complete the previous lecture to unlock">
                                      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(var(--fg-rgb),0.06)" }}><Lock size={15} className="pf-faint" /></span>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate font-medium pf-muted">{v.title || `Video ${vi + 1}`}</div>
                                        <div className="text-xs pf-faint">Lecture {vi + 1}</div>
                                      </div>
                                      <span className="text-[11px] pf-faint shrink-0 inline-flex items-center gap-1"><Lock size={11} /> Locked</span>
                                    </div>
                                  );
                                }
                                return (
                                  <button key={vi} onClick={() => playVideo(item, vi)}
                                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "" : "pf-hover"}`}
                                    style={active ? { background: "rgba(219,37,79,0.12)" } : undefined}>
                                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-[#db254f] text-white" : vDone ? "" : "pf-chip"}`}
                                      style={vDone && !active ? { background: "rgba(16,185,129,0.15)", color: "#10b981" } : undefined}>
                                      {vDone && !active ? <Check size={16} /> : <PlayCircle size={17} />}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-sm truncate ${active ? "font-bold text-[#db254f]" : "font-medium"}`}>{v.title || `Video ${vi + 1}`}</div>
                                      <div className="text-xs pf-faint">Lecture {vi + 1}</div>
                                    </div>
                                    {active ? <span className="text-[11px] font-bold text-[#db254f] shrink-0">Playing</span>
                                      : vDone ? <span className="text-[11px] font-semibold text-emerald-500 shrink-0 inline-flex items-center gap-1"><CheckCircle2 size={12} /> Done</span>
                                      : <span className="text-xs pf-faint shrink-0">Play</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Right: study materials */}
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wide pf-faint mb-2.5 flex items-center gap-1.5"><FileText size={13} className="text-[#db254f]" /> Study Materials</div>
                          {(item.materials || []).length === 0 ? (
                            <p className="pf-faint text-sm">No materials for this class.</p>
                          ) : (
                            <div className="space-y-2">
                              {item.materials.map((m, mi) => {
                                const excel = isExcelFile(m);
                                const cls = "group w-full flex items-center gap-3 rounded-xl p-2.5 pf-hover transition text-left";
                                const bg = { background: "rgba(var(--fg-rgb),0.04)" };
                                const inner = (
                                  <>
                                    <span className="w-9 h-9 rounded-lg pf-chip flex items-center justify-center shrink-0"><FileText size={16} className="text-[#db254f]" /></span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">{m.name || m.fileName || "File"}</div>
                                      <div className="text-[11px] pf-faint">{excel ? "Excel · download" : "View only"}</div>
                                    </div>
                                    {excel
                                      ? <Download size={15} className="pf-faint group-hover:text-[#db254f] shrink-0 transition" />
                                      : <Eye size={15} className="pf-faint group-hover:text-[#db254f] shrink-0 transition" />}
                                  </>
                                );
                                return (
                                  <button key={mi} type="button" onClick={() => (excel ? downloadMaterial(m) : openMaterial(m))} title={excel ? "Download" : "View"} className={cls} style={bg}>{inner}</button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Study-material viewer (in-page, no new tab) ── */}
      {viewMat && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={closeMaterial}>
          <div className="w-full max-w-4xl h-[85vh] pf-card overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b pf-border">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-[#db254f] shrink-0" />
                <span className="font-semibold text-sm truncate">{viewMat.name || viewMat.fileName || "Study Material"}</span>
                <span className="text-[11px] pf-faint shrink-0">· View only</span>
              </div>
              <button onClick={closeMaterial} aria-label="Close" className="w-8 h-8 rounded-full pf-hover flex items-center justify-center pf-muted shrink-0"><X size={18} /></button>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center" style={{ background: "rgba(var(--fg-rgb),0.04)" }}>
              {viewErr ? (
                <p className="pf-muted text-sm px-4 text-center">{viewErr}</p>
              ) : viewUrl ? (
                /* #toolbar=0 hides the browser PDF viewer's toolbar (download/print) — view only. */
                <iframe src={`${viewUrl}#toolbar=0&navpanes=0`} title={viewMat.name || "Study Material"} className="w-full h-full border-0" />
              ) : (
                <span className="inline-flex items-center gap-2 pf-muted text-sm"><Loader2 size={18} className="animate-spin" /> Loading…</span>
              )}
            </div>
          </div>
        </div>
      )}
    </StudentShell>
  );
}
