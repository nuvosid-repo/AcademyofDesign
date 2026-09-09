"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, ArrowRight } from "lucide-react";
import styles from "./Workshops.module.scss";
import staticWorkshops from "@/data/workshops.json";

export default function WorkshopsGrid() {
  // Admin-managed workshops; falls back to the static bundle when none exist.
  const [workshopsList, setWorkshopsList] = useState(staticWorkshops);
  useEffect(() => {
    fetch("/api/public/workshops/", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (Array.isArray(d.workshops) && d.workshops.length) setWorkshopsList(d.workshops); })
      .catch(() => {});
  }, []);

  return (
    <section className={styles.gridSection}>
      <div className={styles.bgGlow1} />
      <div className={styles.bgGlow2} />

      <div className="container position-relative" style={{ zIndex: 10 }}>
        <div className={styles.gridHead}>
          <span className={styles.eyebrow}>
            <span className={styles.dot} /> Upcoming Sessions
          </span>
          <h2>All Workshops</h2>
          <p>Pick a masterclass to view the full agenda, intro video, certificate details, and to reserve your seat.</p>
        </div>

        <div className="row g-4">
          {workshopsList.map((w, idx) => (
            <div key={w.id} className="col-12 col-md-6 col-xl-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: idx * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href={`/workshops/${w.id}`} className={styles.workshopCard}>
                  <div className={styles.cardImage}>
                    <img src={w.image} alt={w.title} />
                    <span className={styles.cardCat}>{w.category}</span>
                    <div className={styles.cardPrice}>
                      <span className={styles.current}>{w.price}</span>
                      <span className={styles.original}>{w.originalPrice}</span>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <h3>{w.title}</h3>
                    <p>{w.subtitle}</p>

                    <div className={styles.cardMeta}>
                      <span><Calendar size={13} /> {w.date}</span>
                      <span><Clock size={13} /> {w.time}</span>
                      <span><MapPin size={13} /> {w.location}</span>
                    </div>

                    <div className={styles.cardCta}>
                      View Details &amp; Register <ArrowRight size={15} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
