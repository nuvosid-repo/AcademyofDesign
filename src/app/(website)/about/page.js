"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Hero from "@/components/About/Hero";
import Legacy from "@/components/About/Legacy";
import Founder from "@/components/About/Founder";
import Stats from "@/components/About/Stats";
import Pillars from "@/components/About/Pillars";
import Presence from "@/components/About/Presence";
import Vision from "@/components/About/Vision";
import Testimonials from "@/components/Testimonials/Testimonials";
import styles from "./About.module.scss";

export default function AboutPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const ctx = gsap.context(() => {
      // Global Section Reveal Animation
      const sections = gsap.utils.toArray(`section`);
      sections.forEach((section) => {
        gsap.from(section, {
          y: 60,
          opacity: 0,
          duration: 1,
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        });
      });

      // Stats Counting (if the number class exists in components)
      const numbers = gsap.utils.toArray(`[class*="number"], [class*="num"]`);
      numbers.forEach(num => {
        const value = parseInt(num.innerText);
        if(!isNaN(value)) {
          gsap.fromTo(num, 
            { innerText: 0 }, 
            { 
              innerText: value, 
              duration: 2, 
              snap: { innerText: 1 },
              scrollTrigger: {
                trigger: num,
                start: "top 90%"
              }
            }
          );
        }
      });
    }, containerRef);
    
    // Fix for scroll issues: refresh after a small delay to ensure all components are sized correctly
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);
    
    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.aboutPage}>
      <Hero />
      <Legacy />
      <Stats />
      <Pillars />
      <Founder />
      <Presence />
      <Vision />
      <Testimonials
        title="Voices From Our Alumni"
        subtitle="Hear directly from designers who built their careers through our programs."
        accentColor="#db254f"
      />
    </div>
  );
}
