"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Radio,
  ClipboardCheck,
  Award,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  CalendarDays,
  Trophy,
} from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { useSession } from "@/context/SessionContext";
import { apiFetch } from "@/lib/api";
import { getStudy, subscribeStudy } from "@/lib/studyStore";
import { cldUrl } from "@/lib/cldImage";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function fmtDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

/* Month calendar that marks the student's live-class dates; hover a marked
   date to see its live class details. Data comes from the dashboard API. */
function LiveClassCalendar({ liveClasses = [] }) {
  const today = new Date();
  const [view, setView] = useState({
    y: today.getFullYear(),
    mo: today.getMonth(),
  });

  const byDate = useMemo(() => {
    const m = {};
    for (const l of liveClasses) {
      if (!l.date) continue;
      (m[l.date] ||= []).push(l);
    }
    return m;
  }, [liveClasses]);

  const firstDay = new Date(view.y, view.mo, 1).getDay();
  const daysInMonth = new Date(view.y, view.mo + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const shift = (d) =>
    setView((v) => {
      let mo = v.mo + d,
        y = v.y;
      if (mo < 0) {
        mo = 11;
        y--;
      }
      if (mo > 11) {
        mo = 0;
        y++;
      }
      return { y, mo };
    });
  const key = (d) =>
    `${view.y}-${String(view.mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const isToday = (d) =>
    today.getFullYear() === view.y &&
    today.getMonth() === view.mo &&
    today.getDate() === d;

  return (
    <div className="pf-card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold flex items-center gap-2">
          <CalendarDays size={17} className="text-[#db254f]" /> Live Class Calendar
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shift(-1)}
            className="w-8 h-8 rounded-lg pf-hover flex items-center justify-center pf-muted"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold w-24 text-center">
            {MONTHS[view.mo].slice(0, 3)} {view.y}
          </span>
          <button
            onClick={() => shift(1)}
            className="w-8 h-8 rounded-lg pf-hover flex items-center justify-center pf-muted"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, idx) => (
          <div
            key={idx}
            className="text-[11px] pf-faint text-center py-1 font-medium"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          if (d === null) return <div key={idx} />;
          const list = byDate[key(d)];
          const has = !!list;
          return (
            <div key={idx} className="relative group h-9">
              <div
                className={`w-full h-full rounded-lg flex items-center justify-center text-sm transition ${has ? "bg-[#db254f] text-white font-semibold cursor-pointer" : isToday(d) ? "ring-1 ring-[#db254f]/50 text-[#db254f] font-semibold" : "pf-muted pf-hover"}`}
              >
                {d}
              </div>
              {has && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 hidden group-hover:block">
                  <div className="pf-card p-3 shadow-xl text-left space-y-2">
                    {list.map((l) => (
                      <div key={l.id}>
                        <div className="text-sm font-semibold leading-tight">
                          {l.title}
                        </div>
                        <div className="text-xs pf-muted mt-0.5">
                          {l.course} · {l.time || "TBA"}
                        </div>
                        {l.link && (
                          <a
                            href={l.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#db254f] hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <ExternalLink size={11} /> Join
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs pf-faint mt-auto pt-3 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded bg-[#db254f] inline-block" /> Live
        class — hover the date for details
      </p>
    </div>
  );
}

/* Auto-advancing banner slider — images come from the admin Banner master. */
function BannerSlider() {
  const [banners, setBanners] = useState([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    apiFetch("/api/student/banners", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBanners(d.banners || []))
      .catch(() => setBanners([]));
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  const go = (n) => setI((x) => (n + banners.length) % banners.length);

  if (!banners.length) {
    return (
      <div className="pf-card h-full min-h-[150px] flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 rounded-xl pf-chip flex items-center justify-center mb-3">
          <ImageIcon size={22} />
        </div>
        <p className="pf-muted text-sm">
          No banners yet. Admin can upload banners from Banner master.
        </p>
      </div>
    );
  }

  return (
    <div className="pf-card overflow-hidden h-full min-h-[150px] relative group">
      {banners.map((b, idx) => (
        <img
          key={b.id}
          src={cldUrl(b.image, { width: 1000 })}
          alt="Banner"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: idx === i ? 1 : 0 }}
        />
      ))}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => go(i - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => go(i + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all ring-1 ring-black/10 ${idx === i ? "w-5 bg-[#db254f]" : "w-1.5 bg-white/70 hover:bg-[#db254f]/70"}`}
                aria-label={`Go to banner ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// seconds → compact "Xh Ym" / "Ym"
function fmtDur(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
// Live "today" value, shows seconds so the counter visibly ticks.
function fmtLive(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(ss).padStart(2, "0")}s`;
}

/* Minimal learning-time card — a live (ticking) "today" counter that never
   jumps backwards on refresh, plus Week/Total and a Mon→Sun mini bar chart. */
function LearningTimeCard() {
  // The counter lives in the layout-level tracker's shared store, so it keeps
  // running across page navigation. This card just subscribes and displays.
  const [v, setV] = useState(getStudy());
  useEffect(() => subscribeStudy(setV), []);
  const live = { today: v.today || 0, week: v.week || 0, total: v.total || 0 };
  const week = v.days || [];
  const today = v.todayDate || "";

  const max = Math.max(1, ...week.map((d) => d.seconds || 0));
  const dayLabel = (iso) => { try { return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "narrow" }); } catch { return ""; } };

  return (
    <div className="pf-card p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="font-bold text-sm flex items-center gap-2"><Clock size={15} className="text-[#db254f]" /> Learning Time</h3>
        <span className="text-[10px] pf-faint">Active study · idle not counted</span>
      </div>
      <div className="flex items-center gap-x-4 gap-y-2.5 flex-wrap">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold text-[#db254f] tabular-nums leading-none">{fmtLive(live.today)}</span>
          <span className="text-xs pf-muted">today</span>
        </div>
        <div className="hidden sm:block h-7 w-px" style={{ background: "rgba(var(--fg-rgb),0.12)" }} />
        <div className="flex items-center gap-4 text-sm">
          <span><span className="pf-muted">Week </span><b className="tabular-nums">{fmtDur(live.week)}</b></span>
          <span><span className="pf-muted">Total </span><b className="tabular-nums">{fmtDur(live.total)}</b></span>
        </div>
        <div className="flex items-end gap-1.5 h-10 ml-auto">
          {(week.length ? week : Array.from({ length: 7 }, () => ({ date: "", seconds: 0 }))).map((d, i) => (
            <div key={d.date || i} className="flex flex-col items-center gap-1">
              <div className="w-2 rounded-full transition-all" style={{ height: `${Math.max(3, ((d.seconds || 0) / max) * 26)}px`, background: d.date && d.date === today ? "#db254f" : "rgba(var(--fg-rgb),0.16)" }} title={d.date ? `${d.date}: ${fmtDur(d.seconds)}` : ""} />
              <span className="text-[9px] pf-faint leading-none">{dayLabel(d.date)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/student/dashboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const s = data?.stats || {
    enrolled: 0,
    liveClasses: 0,
    assessments: 0,
    certificates: 0,
  };
  const tiles = [
    { label: "Enrolled Courses", value: s.enrolled, icon: BookOpen },
    { label: "Live Classes", value: s.liveClasses, icon: Radio },
    { label: "Assessments", value: s.assessments, icon: ClipboardCheck },
    { label: "Certificates", value: s.certificates, icon: Award },
  ];

  return (
    <StudentShell subtitle="Dashboard">
      {/* Row 1 — welcome (wide) + banner */}
      <div className="grid lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 pf-card overflow-hidden relative flex min-h-[118px]">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, rgba(219,37,79,0.12), transparent 60%)",
            }}
            aria-hidden="true"
          />
          <div className="relative p-5 flex flex-col justify-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#db254f] font-semibold mb-1">
              Welcome back
            </p>
            <h2 className="text-xl md:text-2xl font-extrabold">
              {data?.student?.name || user?.name || "Student"} 👋
            </h2>
            <p className="pf-muted mt-1 text-sm">
              Your courses, live sessions, scores and assessments — all in one
              place.
            </p>
          </div>
        </div>
        <BannerSlider />
      </div>

      {/* Row 2 — stat cards (compact) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        {tiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="pf-card pf-stat pf-card-hover p-3.5">
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl pf-chip flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>
              <div>
                <div className="text-xl font-extrabold leading-none">
                  {loading ? "…" : value}
                </div>
                <div className="text-xs pf-muted mt-0.5">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Learning time tracker */}
      <div className="mt-3">
        <LearningTimeCard />
      </div>

      {/* Row 3 — calendar (left) + stacked scores/classes (right), equal height */}
      <div className="grid lg:grid-cols-3 gap-3 mt-3 items-stretch">
        <LiveClassCalendar liveClasses={data?.liveClasses || []} />

        <div className="lg:col-span-2 grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            {/* My scores — quiz scores only (score only, no titles) */}
            <div className="pf-card p-4">
          {(() => {
            const qr = (data?.results || []).filter((r) => r.type !== "Assessment");
            const avg = qr.length ? Math.round(qr.reduce((n, r) => n + (r.percentage || 0), 0) / qr.length) : 0;
            return (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold flex items-center gap-2"><Trophy size={17} className="text-[#db254f]" /> My Scores</h3>
                  {qr.length > 0 && <span className="text-sm"><span className="pf-muted">Avg </span><span className="font-extrabold text-[#db254f]">{avg}%</span></span>}
                </div>
                {loading ? (
                  <p className="pf-muted text-sm">Loading…</p>
                ) : qr.length ? (
                  <div className="space-y-2 max-h-[236px] overflow-y-auto pf-scroll pr-1 -mr-1">
                    {qr.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border pf-border p-2.5">
                        <span className="text-xs pf-muted truncate min-w-0">{r.course || "Quiz"}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-lg font-extrabold">{r.percentage}%</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${r.passed ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}>{r.passed ? "Pass" : "Fail"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="w-11 h-11 rounded-xl pf-chip flex items-center justify-center mx-auto mb-2.5"><Trophy size={20} /></div>
                    <p className="pf-muted text-sm">No quiz scores yet.</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Upcoming live classes */}
        <div className="pf-card p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Radio size={17} className="text-[#db254f]" /> Upcoming Live Classes
          </h3>
          {loading ? (
            <p className="pf-muted text-sm">Loading…</p>
          ) : data?.liveClasses?.length ? (
            <div className="space-y-2 max-h-[236px] overflow-y-auto pf-scroll pr-1 -mr-1">
              {data.liveClasses.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-xl border pf-border p-2.5 pf-hover transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {l.title}
                    </div>
                    <div className="text-xs pf-muted mt-0.5 truncate">
                      {l.course} · {fmtDate(l.date)} {l.time}
                    </div>
                  </div>
                  {l.link && (
                    <a
                      href={l.link}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-[#db254f] hover:bg-[#b91d40] text-white px-3 py-1.5 transition"
                    >
                      <ExternalLink size={12} /> Join
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="pf-muted text-sm">No upcoming live classes.</p>
          )}
            </div>
          </div>

          {/* Assessment Scores — separate card (MCQ / Written / Interview) */}
          {(() => {
            const ar = (data?.results || []).filter((r) => r.type === "Assessment");
            if (loading || !ar.length) return null;
            return (
              <div className="pf-card p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Award size={17} className="text-[#db254f]" /> Assessment Scores
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {ar.map((r) => (
                <div key={r.id} className="rounded-xl border pf-border p-3.5">
                  <div className="font-semibold text-sm truncate mb-2.5">{r.assessmentTitle}</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg py-2" style={{ background: "rgba(var(--fg-rgb),0.05)" }}>
                      <div className="text-[10px] uppercase tracking-wide pf-faint mb-0.5">MCQ</div>
                      <div className="text-base font-extrabold">{r.mcqDone ? `${r.mcqPercentage}%` : "—"}</div>
                    </div>
                    <div className="rounded-lg py-2" style={{ background: "rgba(var(--fg-rgb),0.05)" }}>
                      <div className="text-[10px] uppercase tracking-wide pf-faint mb-0.5">Written</div>
                      <div className="text-base font-extrabold">{r.writtenGraded ? `${r.writtenScore}/${r.writtenTotal}` : (r.writtenSubmitted ? "…" : "—")}</div>
                    </div>
                    <div className="rounded-lg py-2" style={{ background: "rgba(var(--fg-rgb),0.05)" }}>
                      <div className="text-[10px] uppercase tracking-wide pf-faint mb-0.5">Interview</div>
                      <div className="text-base font-extrabold">{r.interviewGraded ? `${r.interviewScore}/${r.interviewTotal}` : "—"}</div>
                    </div>
                  </div>
                </div>
              ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Row 4 — continue learning */}
      <div className="pf-card p-4 mt-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2">
            <BookOpen size={17} className="text-[#db254f]" /> Continue Learning
          </h3>
          <Link
            href="/student/my-courses"
            className="text-sm text-[#db254f] hover:underline inline-flex items-center gap-1 font-medium"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <p className="pf-muted text-sm">Loading…</p>
        ) : data?.courses?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.courses.map((c) => (
              <Link
                key={c.id}
                href={`/student/courses/${c.id}`}
                className="pf-card pf-card-hover p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl pf-chip flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] uppercase tracking-wide text-[#db254f] font-semibold block truncate">
                    {c.category || "Course"}
                  </span>
                  <h4 className="font-bold text-sm truncate">{c.title}</h4>
                  {c.duration && (
                    <div className="flex items-center gap-1 text-[11px] pf-faint mt-0.5">
                      <Clock size={11} /> {c.duration}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="pf-muted text-sm">
            You haven&apos;t enrolled in any course yet. Explore courses on the
            website to get started.
          </p>
        )}
      </div>
    </StudentShell>
  );
}
