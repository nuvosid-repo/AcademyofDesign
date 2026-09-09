"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import styles from "./Instructors.module.scss";
import staticInstructors from "../../data/instructors.json";

export default function Instructors() {
  const containerRef = useRef(null);
  const sliderRef = useRef(null);
  const tweenRef = useRef(null);

  // Admin-managed instructors; falls back to the static bundle when none exist.
  const [instructors, setInstructors] = useState(staticInstructors);
  useEffect(() => {
    fetch("/api/public/instructors/", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (Array.isArray(d.instructors) && d.instructors.length) setInstructors(d.instructors); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Header Reveal
      gsap.fromTo(
        `.${styles.header}`,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power4.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          }
        }
      );

      // Infinite Marquee Animation
      const marqueeWidth = sliderRef.current.scrollWidth / 2;
      
      tweenRef.current = gsap.to(sliderRef.current, {
        x: -marqueeWidth,
        duration: 30,
        ease: "none",
        repeat: -1,
        onReverseComplete: () => {
          if (sliderRef.current) {
            gsap.set(sliderRef.current, { x: 0 });
          }
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, [instructors]);

  // Triple the data to ensure seamless looping
  const tripleInstructors = [...instructors, ...instructors, ...instructors];

  const handleMouseEnter = () => tweenRef.current?.pause();
  const handleMouseLeave = () => tweenRef.current?.play();

  return (
    <section ref={containerRef} className={styles.instructorsSection}>
      <div className="container">
        <div className="row justify-content-center text-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className={styles.header}>
              <h2>Learn from the <span>Best.</span></h2>
              <p>Our instructors are industry veterans, leading designers, and award-winning artists from around the globe.</p>
            </div>
          </div>
        </div>
      </div>

      <div 
        ref={sliderRef} 
        className={styles.marqueeContainer}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {tripleInstructors.map((person, index) => (
          <Link 
            key={index} 
            href={`/instructors/${person.slug}`}
            className={`${styles.instructorCard} ${index % 2 === 0 ? styles.up : styles.down}`}
          >
            <div className={styles.flipper}>
              <div className={styles.front}>
                <div className={styles.imgWrapper}>
                  <Image 
                    src={person.img} 
                    alt={person.name} 
                    fill 
                    className="object-cover" 
                    unoptimized 
                  />
                </div>
                <div className={styles.overlay}>
                  <h3>{person.name}</h3>
                  <span>{person.role}</span>
                </div>
              </div>
              
              <div className={styles.back}>
                <div className={styles.backContent}>
                  <h3>{person.name}</h3>
                  <span className={styles.role}>{person.role}</span>
                  <div className={styles.divider}></div>
                  <span className={styles.educationTitle}>Education</span>
                  <span className={styles.education}>{person.education}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

