"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import WorkHeader from "@/components/Work/WorkHeader";
import WorkCard from "@/components/Work/WorkCard";

const projects = [
  { title: "Neo-Futurism App", student: "Aman Gupta", img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop" },
  { title: "Eco-Luxe Fashion", student: "Priya Sharma", img: "https://images.unsplash.com/photo-1539109132382-381bb3f1c2b3?q=80&w=600&auto=format&fit=crop" },
  { title: "Minimalist Habitat", student: "Rohan Varma", img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=600&auto=format&fit=crop" },
  { title: "Urban Branding", student: "Sneha Kapoor", img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=600&auto=format&fit=crop" },
  { title: "Glassmorphism UI", student: "Vikram Singh", img: "https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?q=80&w=600&auto=format&fit=crop" },
  { title: "Sustainable Fabric", student: "Kavita Rao", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop" }
];

export default function OurWorkPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".work-card", {
        scale: 0.8,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "back.out(1.7)"
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen py-5" style={{ background: "var(--bg-page)", color: "var(--fg)" }}>
      <div className="container py-5">
        <WorkHeader />
        <div className="row g-4 mt-4">
          {projects.map((p, i) => (
            <div key={i} className="col-12 col-md-6 col-lg-4">
              <WorkCard project={p} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
