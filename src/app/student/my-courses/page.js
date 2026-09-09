"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, Compass, GraduationCap, ArrowRight } from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import EnrollButton from "@/components/Payment/EnrollButton";
import { apiFetch } from "@/lib/api";

const priceLabel = (p) => {
  if (!p) return "";
  const s = String(p).trim();
  return s.startsWith("₹") ? s : `₹${s}`;
};

/* Lazy course thumbnail that falls back to a gradient if there's no image. */
function CourseThumb({ src, alt }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="w-full h-36 flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(219,37,79,0.18), rgba(229,107,133,0.08))" }}>
        <BookOpen size={30} className="text-[#db254f]" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className="w-full h-36 object-cover bg-black/10" onError={() => setErr(true)} />;
}

export default function MyCoursesPage() {
  const [enrolled, setEnrolled] = useState([]);
  const [explore, setExplore] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    apiFetch("/api/student/my-courses", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setEnrolled(d.enrolled || []); setExplore(d.explore || []); })
      .catch(() => { setEnrolled([]); setExplore([]); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  return (
    <StudentShell subtitle="My Courses">
      {/* ── Enrolled courses ── */}
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap size={20} className="text-[#db254f]" />
        <h2 className="text-2xl font-bold">My Courses</h2>
      </div>

      {loading ? (
        <p className="pf-muted">Loading…</p>
      ) : enrolled.length === 0 ? (
        <div className="pf-card p-8 text-center pf-muted">
          You haven&apos;t enrolled in any course yet. Explore courses below to get started.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrolled.map((c) => (
            <Link key={c.id} href={`/student/courses/${c.id}`} className="pf-card pf-card-hover p-5 flex flex-col">
              <div className="w-10 h-10 rounded-xl pf-chip flex items-center justify-center mb-4"><BookOpen size={20} /></div>
              <span className="text-xs uppercase tracking-wide text-[#db254f] font-semibold">{c.category || "Course"}</span>
              <h3 className="font-bold text-lg mt-1">{c.title}</h3>
              <p className="text-sm pf-muted mt-2 flex-grow line-clamp-2">{c.description}</p>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5 text-xs pf-faint"><Clock size={13} /> {c.duration || "Self-paced"}</div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#db254f]">Start learning <ArrowRight size={13} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Explore & purchase ── */}
      <div className="flex items-center gap-2 mt-10 mb-4">
        <Compass size={20} className="text-[#db254f]" />
        <h2 className="text-2xl font-bold">Explore Courses</h2>
      </div>
      <p className="pf-muted -mt-2 mb-4">Discover more programs and enroll instantly.</p>

      {loading ? (
        <p className="pf-muted">Loading…</p>
      ) : explore.length === 0 ? (
        <div className="pf-card p-8 text-center pf-muted">
          No more courses to explore right now — you&apos;re enrolled in everything available!
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {explore.map((c) => (
            <div key={c.id} className="pf-card pf-card-hover p-0 overflow-hidden flex flex-col">
              <CourseThumb src={c.image} alt={c.title} />
              <div className="p-5 flex flex-col flex-grow">
                <span className="text-xs uppercase tracking-wide text-[#db254f] font-semibold">{c.category || "Course"}</span>
                <h3 className="font-bold text-lg mt-1">{c.title}</h3>
                <p className="text-sm pf-muted mt-2 flex-grow line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between mt-4">
                  {c.price ? <span className="text-lg font-extrabold">{priceLabel(c.price)}</span> : <span className="text-sm pf-faint">Free</span>}
                  {c.duration && <span className="flex items-center gap-1.5 text-xs pf-faint"><Clock size={13} /> {c.duration}</span>}
                </div>
                <EnrollButton
                  courseId={c.id}
                  courseTitle={c.title}
                  price={priceLabel(c.price)}
                  onSuccess={load}
                  className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-full bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 transition"
                >
                  Enroll Now <ArrowRight size={15} />
                </EnrollButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
