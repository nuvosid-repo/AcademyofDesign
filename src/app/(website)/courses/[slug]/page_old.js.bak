"use client";
import { use } from "react";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CheckCircle, Clock, BookOpen, Users } from "lucide-react";

export default function CourseDetailPage({ params }) {
  const { slug } = use(params);
  const containerRef = useRef(null);
  const title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".detail-fade", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out"
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white py-20 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-32">
          <div className="detail-fade">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-tight">
              {title} <span className="text-purple-500">Mastery.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 leading-relaxed">
              Take a deep dive into the world of {title}. This comprehensive program 
              will take you from the fundamentals to advanced industry-standard practices.
            </p>
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="flex items-center gap-3">
                <Clock className="text-purple-500" size={24} />
                <span className="text-gray-300">6 Months Duration</span>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="text-purple-500" size={24} />
                <span className="text-gray-300">24 Modules</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="text-purple-500" size={24} />
                <span className="text-gray-300">Expert Mentorship</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="text-purple-500" size={24} />
                <span className="text-gray-300">Live Projects</span>
              </div>
            </div>
            <button className="px-10 py-5 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              Enroll in this Course
            </button>
          </div>

          <div className="detail-fade relative h-[500px] rounded-[50px] overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-blue-600/30 mix-blend-overlay z-10" />
            <img 
              src={`https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop`} 
              alt={title}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100"
            />
          </div>
        </div>

        <section className="detail-fade bg-white/5 border border-white/10 rounded-[40px] p-12 md:p-20">
          <h2 className="text-4xl font-bold mb-10">Curriculum Overview</h2>
          <div className="space-y-8">
            {[
              "Fundamentals of Design Thinking",
              "Advanced Visual Communication",
              "Prototyping & Interaction Principles",
              "Industry Standard Tools Mastery",
              "Capstone Portfolio Project",
              "Career Preparation & Placement Support"
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-6 border-b border-white/10 pb-6 group cursor-default">
                <span className="text-3xl font-bold text-white/20 group-hover:text-purple-500 transition-colors">0{i+1}</span>
                <p className="text-xl font-medium text-gray-300 group-hover:text-white transition-colors">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
