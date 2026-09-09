"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, BookOpen, PlayCircle, FileText, HelpCircle, ChevronDown, Clock,
  Users, Download, CheckCircle2, Video as VideoIcon,
} from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { apiFetch } from "@/lib/api";

/* Resolve a video URL to an embeddable player. */
function VideoEmbed({ url, title }) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  const box = "w-full aspect-video rounded-xl overflow-hidden border pf-border bg-black";
  if (yt) return <div className={box}><iframe src={`https://www.youtube.com/embed/${yt[1]}`} title={title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>;
  if (vimeo) return <div className={box}><iframe src={`https://player.vimeo.com/video/${vimeo[1]}`} title={title} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>;
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return <div className={box}><video src={url} controls className="w-full h-full" /></div>;
  return <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#db254f] hover:underline"><PlayCircle size={15} /> Open video</a>;
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
  const [imgError, setImgError] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    apiFetch(`/api/student/courses/${id}`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; })
      .then((d) => {
        setData(d);
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
    setCurrentVideo({ ci: item.index, vi, url: v.url, title: v.title, description: v.description, className: item.name });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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

  return (
    <StudentShell subtitle="Course">
      <Link href="/student/my-courses" className="inline-flex items-center gap-1.5 pf-muted hover:text-[#db254f] text-sm mb-4"><ArrowLeft size={15} /> Back to My Courses</Link>

      {/* ── Top: video player (left) + course info (right) ── */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Player */}
        <div className="lg:col-span-2">
          {currentVideo?.url ? (
            <>
              <VideoEmbed url={currentVideo.url} title={currentVideo.title} />
              <div className="mt-4">
                <span className="text-xs uppercase tracking-wide text-[#db254f] font-semibold">{currentVideo.className}</span>
                <h2 className="font-bold text-xl mt-1" style={{ marginTop: "0.25rem", marginBottom: 0 }}>{currentVideo.title || "Untitled video"}</h2>
                {currentVideo.description && <p className="pf-muted text-sm mt-2 leading-relaxed">{currentVideo.description}</p>}
              </div>
            </>
          ) : (
            <div className="pf-card w-full aspect-video flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-2xl pf-chip flex items-center justify-center mb-3"><PlayCircle size={26} /></div>
              <p className="pf-muted text-sm">No videos in this course yet.</p>
            </div>
          )}
        </div>

        {/* Course info card */}
        <div className="pf-card overflow-hidden">
          <div className="relative h-36">
            {course.image && !imgError ? (
              <img src={course.image} alt={course.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : (
              <div className="w-full h-full" style={{ background: "linear-gradient(120deg, #db254f, #e56b85)" }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.6))" }} />
            {course.category && <span className="absolute bottom-3 left-4 text-[11px] uppercase tracking-wide bg-[#db254f] text-white px-2.5 py-1 rounded-md font-semibold">{course.category}</span>}
          </div>
          <div className="p-5">
            <h1 className="font-extrabold text-xl leading-snug">{course.title}</h1>
            {course.description && <p className="pf-muted text-sm mt-2 leading-relaxed line-clamp-3">{course.description}</p>}
            <div className="mt-4 pt-4 border-t pf-border space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5"><BookOpen size={15} className="text-[#db254f] shrink-0" /> <span className="pf-muted">{classCount} class{classCount !== 1 ? "es" : ""}</span></div>
              <div className="flex items-center gap-2.5"><VideoIcon size={15} className="text-[#db254f] shrink-0" /> <span className="pf-muted">{videoCount} video{videoCount !== 1 ? "s" : ""}</span></div>
              {quizCount > 0 && <div className="flex items-center gap-2.5"><HelpCircle size={15} className="text-[#db254f] shrink-0" /> <span className="pf-muted">{quizCount} quiz{quizCount !== 1 ? "zes" : ""}</span></div>}
              {course.duration && <div className="flex items-center gap-2.5"><Clock size={15} className="text-[#db254f] shrink-0" /> <span className="pf-muted">{course.duration}</span></div>}
              {course.instructors?.length > 0 && <div className="flex items-start gap-2.5"><Users size={15} className="text-[#db254f] shrink-0 mt-0.5" /> <span className="pf-muted">{course.instructors.join(", ")}</span></div>}
            </div>
          </div>
        </div>
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
            return (
              <div key={i} className="pf-card overflow-hidden">
                <button onClick={() => setOpenIdx(isOpen ? -1 : i)} className="w-full flex items-center gap-3.5 p-4 text-left transition pf-hover">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${isQuiz ? "text-white" : "pf-chip"}`}
                    style={isQuiz ? { background: "linear-gradient(135deg, #db254f, #e56b85)" } : undefined}>
                    {isQuiz ? <HelpCircle size={18} /> : String(classNo).padStart(2, "0")}
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
                  </div>
                  {isQuiz && <span className="text-[11px] font-bold uppercase tracking-wide text-[#db254f] bg-rose-500/10 px-2.5 py-1 rounded-full hidden sm:block">Quiz</span>}
                  <ChevronDown size={18} className={`pf-faint transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t pf-border">
                    {isQuiz ? (
                      <div className="p-4 sm:p-5">
                        {item.questionCount > 0
                          ? <QuizPlayer courseId={course.id} quiz={item} />
                          : <p className="pf-muted text-sm">This quiz has no questions yet.</p>}
                      </div>
                    ) : (
                      <div>
                        {(item.videos || []).length === 0 && (item.materials || []).length === 0 && (
                          <p className="pf-muted text-sm p-5">No content in this class yet.</p>
                        )}
                        {/* Video list — click to play in the player above */}
                        {(item.videos || []).map((v, vi) => {
                          const active = currentVideo?.ci === item.index && currentVideo?.vi === vi;
                          return (
                            <button key={vi} onClick={() => playVideo(item, vi)}
                              className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left transition border-b pf-border last:border-b-0"
                              style={active ? { background: "rgba(219,37,79,0.08)" } : undefined}>
                              <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-[#db254f] text-white" : "pf-chip"}`}>
                                <PlayCircle size={17} />
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm truncate ${active ? "font-bold text-[#db254f]" : "font-medium"}`}>{v.title || `Video ${vi + 1}`}</div>
                                <div className="text-xs pf-faint">Lecture {vi + 1}</div>
                              </div>
                              {active ? <span className="text-[11px] font-bold text-[#db254f] shrink-0">Playing</span> : <span className="text-xs pf-faint shrink-0">Play</span>}
                            </button>
                          );
                        })}
                        {/* Materials */}
                        {(item.materials || []).length > 0 && (
                          <div className="px-4 sm:px-5 py-4">
                            <div className="flex items-center gap-2 mb-2.5"><FileText size={15} className="text-[#db254f]" /><span className="font-semibold text-sm">Study Materials</span></div>
                            <div className="flex flex-wrap gap-2">
                              {item.materials.map((m, mi) => (
                                <a key={mi} href={m.url} className="inline-flex items-center gap-2 text-sm rounded-xl border pf-border px-3 py-2 pf-hover transition">
                                  <Download size={14} className="text-[#db254f]" /> {m.name || m.fileName || "File"}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}
