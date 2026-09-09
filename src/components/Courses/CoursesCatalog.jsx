"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import styles from "./CoursesCatalog.module.scss";
import CourseCard from "@/components/Cards/CourseCard";

gsap.registerPlugin(ScrollTrigger);

const PALETTE = ["#db254f", "#6f9ac4", "#8b5cf6", "#10b981", "#f59e0b"];

const mapCard = (ac) => ({
  id: ac.id,
  title: ac.title,
  desc: ac.shortDescription,
  image: ac.thumbnail || "/assets/uiux_course.jpg",
  duration: ac.duration,
  level: ac.level,
  tags: [ac.instructor].filter(Boolean),
});

export default function CoursesCatalog() {
  const [catData, setCatData] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const tabsRef = useRef(null);
  const cardsRef = useRef(null);

  const active = catData.find((c) => c.id === activeId) || catData[0];

  /* Build the catalog from admin categories + admin courses. */
  useEffect(() => {
    Promise.all([
      fetch("/api/public/categories/", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ categories: [] })),
      fetch("/api/public/courses/", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ courses: [] })),
    ]).then(([catRes, courseRes]) => {
      const cats = catRes.categories || [];
      const courses = courseRes.courses || [];
      const built = cats.map((cat, idx) => ({
        id: cat.id,
        name: cat.name,
        tagline: "Programs",
        accent: PALETTE[idx % PALETTE.length],
        courses: courses
          .filter((c) => (c.category || "").toLowerCase() === cat.name.toLowerCase())
          .map(mapCard),
      }));
      setCatData(built);
      setActiveId(built[0]?.id || "");
      setLoaded(true);
    });
  }, []);

  /* Section entrance */
  useEffect(() => {
    if (!headerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(headerRef.current.children, {
        y: 44, opacity: 0, stagger: 0.12, duration: 1.1,
        ease: "power4.out",
        scrollTrigger: { trigger: headerRef.current, start: "top 82%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  /* Card stagger on category change */
  useEffect(() => {
    if (!cardsRef.current) return;
    const cards = cardsRef.current.querySelectorAll("[data-course-card]");
    gsap.fromTo(
      cards,
      { y: 44, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.72, stagger: 0.1, ease: "expo.out" }
    );
  }, [activeId, catData]);

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.wrapper}>

        <div ref={headerRef} className={styles.header}>
          <span className={styles.eyebrow}>Our Programs</span>
          <h2 className={styles.title}>
            Category <em>Catalog</em>
          </h2>
        </div>

        {loaded && catData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "rgba(var(--fg-rgb),0.5)" }}>
            No courses available yet. Check back soon.
          </div>
        ) : !active ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "rgba(var(--fg-rgb),0.4)" }}>
            Loading courses…
          </div>
        ) : (
          <>
            <div ref={tabsRef} className={styles.tabNav}>
              {catData.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`${styles.tab} ${activeId === c.id ? styles.tabActive : ""}`}
                >
                  {activeId === c.id && (
                    <motion.div
                      layoutId="catalog-tab-bg"
                      className={styles.tabBg}
                      style={{ background: `${c.accent}16`, borderColor: `${c.accent}40` }}
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className={styles.tabDot} style={{ background: c.accent }} />
                  <span className={styles.tabName}>{c.name}</span>
                  <span
                    className={styles.tabBadge}
                    style={activeId === c.id ? { color: c.accent, background: `${c.accent}18`, borderColor: `${c.accent}38` } : {}}
                  >
                    {c.courses.length}
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.23, 1, 0.32, 1] } }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              >
                <div className={styles.catHead}>
                  <div>
                    <span className={styles.catTag} style={{ color: active.accent, background: `${active.accent}12`, borderColor: `${active.accent}30` }}>
                      {active.tagline}
                    </span>
                    <h3 className={styles.catTitle}>{active.name}</h3>
                  </div>
                  <span className={styles.catCount}>{active.courses.length}&nbsp;Programs Available</span>
                </div>

                {active.courses.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "rgba(var(--fg-rgb),0.45)" }}>
                    No programs in this category yet.
                  </div>
                ) : (
                  <div ref={cardsRef} className={styles.grid}>
                    {active.courses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        accent={active.accent}
                        category={active.name}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}

      </div>
    </section>
  );
}
