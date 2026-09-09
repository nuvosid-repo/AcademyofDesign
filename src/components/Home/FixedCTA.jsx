"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Sparkles, ArrowRight, CalendarCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, onAuthChange } from "@/lib/api";
import styles from "./FixedCTA.module.scss";

const SCROLL_THRESHOLD = 0.30; // 30% of page

export default function FixedCTA() {
  const pathname    = usePathname();
  const { openModal } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = not yet checked
  const [visible,  setVisible]  = useState(false);
  const [entering, setEntering] = useState(false);
  const [exiting,  setExiting]  = useState(false);
  const scrollListenerRef       = useRef(null);

  /* ── Check auth on mount and whenever auth state changes ── */
  useEffect(() => {
    const check = () => {
      apiFetch("/api/auth/check")
        .then(r => r.json())
        // Only a student session counts as "logged in" on the website.
        .then(data => setIsAuthenticated(data.authenticated && data.user?.role === "student"))
        .catch(() => setIsAuthenticated(false));
    };
    check();
    return onAuthChange(check);
  }, []);

  /* ── Reset + re-attach scroll listener on every page change ── */
  useEffect(() => {
    // Reset animation states for the new page
    setExiting(false);
    setEntering(false);
    setVisible(false);

    const checkScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      if (window.scrollY / total >= SCROLL_THRESHOLD) {
        setVisible(true);
        window.removeEventListener("scroll", checkScroll);
      }
    };

    // Small delay so new page content has painted (height is accurate)
    const timer = setTimeout(() => {
      window.scrollTo(0, 0); // scroll to top on navigation
      window.addEventListener("scroll", checkScroll, { passive: true });
    }, 120);

    scrollListenerRef.current = checkScroll;

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", checkScroll);
    };
  }, [pathname]); // re-run every time the route changes

  /* ── Trigger enter animation one rAF after visible = true ── */
  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => setEntering(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  /* ── Dismiss: hide for this page only (no storage) ── */
  const dismiss = useCallback(() => {
    setEntering(false);
    setExiting(true);
    // Remove from DOM after animation completes
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 420);
  }, []);

  /* ── Escape key dismisses ── */
  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  // On a workshop detail page (/workshops/<slug>) the bar becomes a
  // "Reserve Your Spot" prompt and shows regardless of auth state.
  const isWorkshopDetail = /^\/workshops\/[^/]+/.test(pathname);

  if (!isWorkshopDetail && (isAuthenticated === null || isAuthenticated)) return null;
  if (!visible) return null;

  const reserveSpot = () => {
    document.getElementById("register")?.scrollIntoView({ behavior: "smooth", block: "start" });
    dismiss();
  };

  const cls = [
    styles.cta,
    entering && !exiting ? styles.entering : "",
    exiting ? styles.exiting : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={cls}
      role="complementary"
      aria-label={isWorkshopDetail ? "Reserve your spot" : "Create an account"}
    >
      <div className={styles.accentLine} aria-hidden="true" />

      <div className={styles.inner}>

        {/* Left: icon + copy */}
        <div className={styles.left}>
          <div className={styles.iconWrap} aria-hidden="true">
            {isWorkshopDetail ? <CalendarCheck size={18} /> : <Sparkles size={18} />}
          </div>
          <div className={styles.copy}>
            {isWorkshopDetail ? (
              <>
                <p className={styles.headline}>
                  Secure Your Workshop Seat
                </p>
                <p className={styles.sub}>
                  Limited seats available — reserve your spot before this masterclass fills up.
                </p>
              </>
            ) : (
              <>
                <p className={styles.headline}>
                  Transform Your Creative Career
                </p>
                <p className={styles.sub}>
                  Join 5,000+ designers. Build real skills. Get placed faster.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className={styles.actions}>
          {isWorkshopDetail ? (
            <button className={styles.primaryBtn} onClick={reserveSpot}>
              <span>Reserve Your Spot</span>
              <ArrowRight size={15} strokeWidth={2.5} />
            </button>
          ) : (
            <>
              <button
                className={styles.primaryBtn}
                onClick={() => { dismiss(); openModal("signup"); }}
              >
                <span>Create Account</span>
                <ArrowRight size={15} strokeWidth={2.5} />
              </button>
              <Link href="/courses" className={styles.secondaryBtn} onClick={dismiss}>
                Learn More
              </Link>
            </>
          )}
          <button
            className={styles.closeBtn}
            onClick={dismiss}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
