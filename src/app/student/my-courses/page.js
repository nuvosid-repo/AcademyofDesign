"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, Compass, GraduationCap, ArrowRight, Calendar, MapPin, Sparkles } from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import EnrollButton from "@/components/Payment/EnrollButton";
import { apiFetch } from "@/lib/api";
import { cldUrl } from "@/lib/cldImage";

const priceLabel = (p) => {
  if (!p) return "";
  const s = String(p).trim();
  return s.startsWith("₹") ? s : `₹${s}`;
};

// Access expiry (1 year from purchase) → readable date + days remaining.
function expiryInfo(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  return { label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), days };
}

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
  return <img src={cldUrl(src, { width: 500 })} alt={alt} loading="lazy" decoding="async" className="w-full h-36 object-cover bg-black/10" onError={() => setErr(true)} />;
}

export default function MyCoursesPage() {
  const [enrolled, setEnrolled] = useState([]);
  const [explore, setExplore] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    apiFetch("/api/student/my-courses", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setEnrolled(d.enrolled || []); setExplore(d.explore || []); })
      .catch(() => { setEnrolled([]); setExplore([]); })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    apiFetch("/api/public/workshops/", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setWorkshops(d.workshops || []))
      .catch(() => setWorkshops([]));
  }, []);

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
              {(() => { const e = expiryInfo(c.expiresAt); return e ? (
                <div className={`text-[11px] mt-2.5 pt-2.5 border-t pf-border inline-flex items-center gap-1.5 ${e.days <= 30 ? "text-amber-500" : "pf-faint"}`}>
                  <Calendar size={12} /> Access valid till {e.label}{e.days <= 30 && e.days > 0 ? ` · ${e.days} day${e.days !== 1 ? "s" : ""} left` : ""}
                </div>
              ) : null; })()}
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
                <Link href={`/courses/${c.id}`} target="_blank" rel="noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-full border pf-border px-5 py-2.5 pf-hover transition">
                  See More Detail <ArrowRight size={15} />
                </Link>
                <EnrollButton
                  courseId={c.id}
                  courseTitle={c.title}
                  price={priceLabel(c.price)}
                  onSuccess={load}
                  className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-full bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 transition"
                >
                  Enroll Now <ArrowRight size={15} />
                </EnrollButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Workshops ── */}
      {workshops.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-10 mb-4">
            <Sparkles size={20} className="text-[#db254f]" />
            <h2 className="text-2xl font-bold">Workshops</h2>
          </div>
          <p className="pf-muted -mt-2 mb-4">Hands-on live workshops — reserve your seat.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workshops.map((w) => (
              <div key={w.id} className="pf-card pf-card-hover p-0 overflow-hidden flex flex-col">
                <CourseThumb src={w.image} alt={w.title} />
                <div className="p-5 flex flex-col flex-grow">
                  {w.category && <span className="text-xs uppercase tracking-wide text-[#db254f] font-semibold">{w.category}</span>}
                  <h3 className="font-bold text-lg mt-1">{w.title}</h3>
                  {w.subtitle && <p className="text-sm pf-muted mt-2 flex-grow line-clamp-2">{w.subtitle}</p>}
                  <div className="mt-3 space-y-1.5 text-xs pf-faint">
                    {w.date && <div className="flex items-center gap-1.5"><Calendar size={13} className="text-[#db254f]" /> {w.date}{w.time ? ` · ${w.time}` : ""}</div>}
                    {w.location && <div className="flex items-center gap-1.5"><MapPin size={13} className="text-[#db254f]" /> {w.location}</div>}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    {w.price ? (
                      <span className="inline-flex items-baseline gap-2">
                        <span className="text-lg font-extrabold">{priceLabel(w.price)}</span>
                        {w.originalPrice && <span className="text-xs pf-faint line-through">{priceLabel(w.originalPrice)}</span>}
                      </span>
                    ) : <span className="text-sm pf-faint">Free</span>}
                  </div>
                  <Link href={`/workshops/${w.id}`} className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-full bg-[#db254f] hover:bg-[#b91d40] text-white px-5 py-2.5 transition">
                    View &amp; Register <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </StudentShell>
  );
}
