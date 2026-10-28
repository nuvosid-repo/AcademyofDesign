"use client";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { setStudy } from "@/lib/studyStore";

const HEARTBEAT_MS = 60_000;        // persist to the server every minute
const ACTIVE_WINDOW_MS = 150_000;   // "active" = interacted within the last 2.5 min
const IDLE_LOGOUT_MS = 20 * 60_000; // no activity this long → session expires

// Pages where learning time is NOT tracked and idle-logout is paused — the exam
// and live interview run their own timers/anti-cheat.
const EXCLUDED = /\/(exam|interview)(\/|$|\?)/;

// A playing video/audio counts as active learning even without input.
function mediaPlaying() {
  try {
    return Array.from(document.querySelectorAll("video, audio"))
      .some((m) => !m.paused && !m.ended && m.readyState > 2);
  } catch { return false; }
}

// Owns the live learning-time counter. Mounted once in the persistent student
// layout, so it keeps counting continuously across page navigations and feeds
// the shared store that the dashboard card reads. Renders nothing.
export default function StudyTimeTracker() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname; // kept current so the intervals see the live route
  const lastAct = useRef(Date.now());
  const stopped = useRef(false);
  const base = useRef({ today: 0, week: 0, total: 0 }); // monotonic displayed values

  useEffect(() => {
    const bump = () => { lastAct.current = Date.now(); };
    const ev = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    ev.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const onVis = () => { if (!document.hidden) lastAct.current = Date.now(); };
    document.addEventListener("visibilitychange", onVis);

    // Skip counting/logout on the exam/interview pages, and when logged out.
    const skip = () => EXCLUDED.test(pathRef.current || "") || !getToken("student");
    const engagedNow = () => !document.hidden && (Date.now() - lastAct.current < ACTIVE_WINDOW_MS || mediaPlaying());

    const pull = () =>
      apiFetch("/api/student/study-time", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          let stored = 0;
          try { stored = parseInt(localStorage.getItem(`studyLive:${d.today}`) || "0", 10) || 0; } catch { /* noop */ }
          base.current = {
            today: Math.max(base.current.today, d.todaySeconds || 0, stored),
            week: Math.max(base.current.week, d.weekSeconds || 0),
            total: Math.max(base.current.total, d.totalSeconds || 0),
          };
          setStudy({ ...base.current, days: d.week || [], todayDate: d.today || "" });
        })
        .catch(() => {});
    pull();
    const resync = setInterval(pull, 60_000);

    const heartbeat = setInterval(() => {
      if (stopped.current) return;
      if (skip()) { lastAct.current = Date.now(); return; }
      const idle = Date.now() - lastAct.current;
      if (idle > IDLE_LOGOUT_MS) {
        stopped.current = true;
        try { clearToken("student"); } catch { /* noop */ }
        router.replace("/student/login?expired=1");
        return;
      }
      if (engagedNow()) apiFetch("/api/student/study-time", { method: "POST", toast: false }).catch(() => {});
    }, HEARTBEAT_MS);

    // Live counter: tick every second while engaged, across all pages.
    const tick = setInterval(() => {
      if (stopped.current || skip() || !engagedNow()) return;
      base.current = { today: base.current.today + 1, week: base.current.week + 1, total: base.current.total + 1 };
      setStudy({ today: base.current.today, week: base.current.week, total: base.current.total });
      try {
        const dd = (new Date(Date.now() + 5.5 * 3600_000)).toISOString().slice(0, 10);
        localStorage.setItem(`studyLive:${dd}`, String(base.current.today));
      } catch { /* noop */ }
    }, 1000);

    return () => {
      clearInterval(resync); clearInterval(heartbeat); clearInterval(tick);
      ev.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router]);

  return null;
}
