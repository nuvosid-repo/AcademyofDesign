"use client";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch, clearToken, getToken } from "@/lib/api";

// Pages where learning time is NOT tracked and idle-logout is paused — the exam
// and live interview run their own timers/anti-cheat.
const EXCLUDED = /\/(exam|interview)(\/|$|\?)/;

const HEARTBEAT_MS = 60_000;        // ping every minute
const ACTIVE_WINDOW_MS = 150_000;   // "active" = interacted within the last 2.5 min
const IDLE_LOGOUT_MS = 20 * 60_000; // no activity this long → session expires

// Any video/audio currently playing counts as active learning even without
// mouse/keyboard activity (so watching a lesson keeps counting).
function mediaPlaying() {
  try {
    return Array.from(document.querySelectorAll("video, audio"))
      .some((m) => !m.paused && !m.ended && m.readyState > 2);
  } catch { return false; }
}

// Tracks a signed-in student's ACTIVE learning time. Runs globally in the
// student portal; renders nothing.
export default function StudyTimeTracker() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname; // kept current so the interval sees the live route
  const lastActivity = useRef(Date.now());
  const stopped = useRef(false);

  useEffect(() => {
    const bump = () => { lastActivity.current = Date.now(); };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const onVis = () => { if (!document.hidden) lastActivity.current = Date.now(); };
    document.addEventListener("visibilitychange", onVis);

    let timer;
    const beat = () => {
      if (stopped.current) return;
      // On the exam / interview, don't count time or idle-log-out — and keep the
      // idle clock fresh so leaving those pages doesn't trigger a logout.
      if (EXCLUDED.test(pathRef.current || "")) { lastActivity.current = Date.now(); return; }
      // Not signed in (e.g. the login page) → nothing to track or expire.
      if (!getToken("student")) { lastActivity.current = Date.now(); return; }
      const idle = Date.now() - lastActivity.current;

      // Session expires after long inactivity → log the student out.
      if (idle > IDLE_LOGOUT_MS) {
        stopped.current = true;
        clearInterval(timer);
        try { clearToken("student"); } catch { /* noop */ }
        router.replace("/student/login?expired=1");
        return;
      }

      // Count time only while the tab is visible AND the user is engaged
      // (recent interaction, or a lesson is playing). Idle time is skipped.
      const engaged = !document.hidden && (idle < ACTIVE_WINDOW_MS || mediaPlaying());
      if (engaged && getToken("student")) {
        apiFetch("/api/student/study-time", { method: "POST", toast: false }).catch(() => {});
      }
    };
    timer = setInterval(beat, HEARTBEAT_MS);

    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router]);

  return null;
}
