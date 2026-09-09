"use client";
import InstructorsHeader from "@/components/Instructors/InstructorsHeader";
import InstructorsShowcase from "@/components/Instructors/InstructorsShowcase";
import styles from "@/components/Instructors/Instructors.module.scss";

export default function InstructorsPage() {
  return (
    <div className={styles.pageWrapper}>
      <InstructorsHeader />

      <section className={styles.gridSection}>
        <div className={styles.bgGlow1} />
        <div className={styles.bgGlow2} />

        <div className="container position-relative" style={{ zIndex: 10 }}>
          <div className={styles.gridHead}>
            <span className={styles.gridEyebrow}>
              <span className={styles.dot} /> Our Mentors
            </span>
            <h2>The People Behind Your Growth</h2>
            <p>
              Every program at Nuvosid is led by a hand-picked expert. Pick a
              mentor to view their full background, credentials, and courses.
            </p>
          </div>

          <InstructorsShowcase />
        </div>
      </section>
    </div>
  );
}
