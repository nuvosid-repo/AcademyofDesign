"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import styles from "./Instructors.module.scss";

import staticInstructors from "../../data/instructors.json";

export default function InstructorsShowcase() {
  // Admin-managed instructors; falls back to the static bundle when none exist.
  const [instructorsList, setInstructorsList] = useState(staticInstructors);
  useEffect(() => {
    fetch("/api/public/instructors/", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (Array.isArray(d.instructors) && d.instructors.length) setInstructorsList(d.instructors); })
      .catch(() => {});
  }, []);

  return (
    <div className="row g-4 g-lg-4 mt-2">
      {instructorsList.map((ins, idx) => (
        <div key={ins.slug} className="col-12 col-sm-6 col-lg-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: idx * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-100"
          >
            <Link href={`/instructors/${ins.slug}`} className={styles.mentorCard}>
              <div className={styles.mentorImage}>
                <img src={ins.image} alt={ins.name} />
                <div className={styles.mentorImageOverlay} />
                {ins.experience && (
                  <span className={styles.expBadge}>{ins.experience}</span>
                )}
              </div>

              <div className={styles.mentorBody}>
                <span className={styles.mentorRole}>{ins.role}</span>
                <h3>{ins.name}</h3>
                <p className={styles.mentorDesignation}>{ins.designation}</p>

                <div className={styles.mentorCreds}>
                  {ins.credentials.slice(0, 2).map((cred, i) => (
                    <span key={i} className={styles.credPill}>
                      <GraduationCap size={11} /> {cred}
                    </span>
                  ))}
                </div>

                <span className={styles.mentorCta}>
                  View Profile <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          </motion.div>
        </div>
      ))}
    </div>
  );
}
