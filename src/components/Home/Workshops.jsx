"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Link from "next/link";
import { cldUrl } from "@/lib/cldImage";
import { Calendar, MapPin, Clock, ArrowRight, ArrowUpRight } from "lucide-react";
import styles from "./Workshops.module.scss";
import staticWorkshops from "@/data/workshops.json";

export default function Workshops() {
  const containerRef = useRef(null);
  const cardsRef = useRef([]);

  // Admin-managed workshops; falls back to the static bundle when none exist.
  const [workshopsList, setWorkshopsList] = useState(staticWorkshops);
  useEffect(() => {
    fetch("/api/public/workshops/", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (Array.isArray(d.workshops) && d.workshops.length) setWorkshopsList(d.workshops); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card, idx) => {
        if (!card) return;
        gsap.from(card, {
          y: 60,
          opacity: 0,
          duration: 0.9,
          delay: idx * 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            once: true,
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [workshopsList]);

  return (
    <section ref={containerRef} className={styles.workshopsSection}>
      <div className={styles.container}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>Live Events</span>
            <h2>Upcoming <span>Workshops.</span></h2>
            <p>
              Join our interactive sessions to learn specific skills, network
              with peers, and get hands-on experience from industry experts.
            </p>
          </div>
          <Link href="/workshops" className={styles.viewAllBtn}>
            View All Workshops <ArrowRight size={18} />
          </Link>
        </div>

        <div className={styles.cardsGrid}>
          {workshopsList.map((workshop, idx) => (
            <Link
              key={workshop.id}
              href={`/workshops#${workshop.id}`}
              ref={(el) => (cardsRef.current[idx] = el)}
              className={styles.workshopCard}
            >
              <div className={styles.imageWrapper}>
                <img src={cldUrl(workshop.image, { width: 500 })} alt={workshop.title} loading="lazy" decoding="async" />
                <div className={styles.overlay} />
                <span className={styles.categoryTag}>{workshop.category}</span>
              </div>

              <div className={styles.cardBody}>
                <h3>{workshop.title}</h3>
                <p className={styles.subtitle}>{workshop.subtitle}</p>

                <div className={styles.metaInfo}>
                  <div className={styles.metaItem}>
                    <Calendar size={14} />
                    <span>{workshop.date}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <Clock size={14} />
                    <span>{workshop.time}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <MapPin size={14} />
                    <span>{workshop.location}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.pricing}>
                    <span className={styles.price}>{workshop.price}</span>
                    <span className={styles.originalPrice}>{workshop.originalPrice}</span>
                  </div>
                  <span className={styles.cardCta}>
                    Register <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
