'use client';

import { useParams, useRouter } from 'next/navigation';
import { cldUrl } from '@/lib/cldImage';
import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, CheckCircle2, Plus, Minus, Tv, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import WhyNuvosid from '@/components/Home/WhyNuvosid';
import CoursePhases from '@/components/Courses/CoursePhases';
import EnrollButton from '@/components/Payment/EnrollButton';
import styles from './CourseDetail.module.scss';
import courseDetailsData from '@/data/courseDetails.json';
import categories from '@/data/courses.json';
import instructorsList from '@/data/instructors.json';

// Resolve a course-instructor name to its mentor profile slug (falls back to a
// slugified name so the link still points somewhere sensible).
const mentorSlug = (name) =>
  instructorsList.find((m) => m.name.toLowerCase() === (name || '').toLowerCase())?.slug ||
  (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Default rich sections used when a course has no static courseDetails.json
// entry (both for courses.json basics and admin-managed courses).
const DEFAULT_KEYPOINTS = [
  { title: "Expert Faculty", text: "Industry experts with years of practical experience." },
  { title: "Live Projects", text: "Real-world client briefs to build a professional portfolio." },
  { title: "Placement Support", text: "Dedicated career guidance and interview preparation." },
  { title: "Hands-on Learning", text: "Studio sessions with professional-grade tools." },
  { title: "Industry Network", text: "Connect with top studios and creative firms." },
  { title: "Certification", text: "Globally recognized design certification upon completion." },
];
const DEFAULT_CURRICULUM = [
  { title: "Foundations", content: "Master core principles and essential techniques of design thinking, visual communication, and creative problem-solving." },
  { title: "Application", content: "Complex industry-standard projects and workflows. Real client briefs, feedback cycles, and iterative design processes." },
  { title: "Mastery", content: "Portfolio completion and professional career preparation. Industry reviews, placement assistance, and career strategy." },
];
const DEFAULT_INSTRUCTORS = [
  { name: "Siddharth Sharma", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop" },
  { name: "Shantanu Sharma", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop" },
  { name: "Manan Agrawal", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop" },
  { name: "Kritik Kothari", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=300&auto=format&fit=crop" },
  { name: "A.K. Sharma", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop" },
];
const DEFAULT_CONTACT = { email: "academy@nuvosid.design", phone: "+91 9929943246" };

const instructorImage = (name) =>
  instructorsList.find((m) => m.name.toLowerCase() === (name || "").toLowerCase())?.image ||
  DEFAULT_INSTRUCTORS[0].image;

// Map an admin-managed course into the rich detail shape. Rich sections use
// sensible defaults — override any of them by adding a courseDetails.json entry
// with the same `id`.
// Convert a YouTube / Vimeo / direct URL into an iframe-embeddable URL.
function toEmbed(url) {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

function mapAdminToDetail(ac) {
  return {
    id: ac.id,
    title: ac.title,
    subtitle: ac.category || "Course",
    description: ac.overview || ac.shortDescription || "",
    heroImage: ac.banner || ac.thumbnail || "",
    videoUrl: ac.introVideo || "",
    keyPoints: DEFAULT_KEYPOINTS,
    curriculum: DEFAULT_CURRICULUM,
    instructors: (ac.instructors && ac.instructors.length)
      ? ac.instructors.map((name) => ({ name, image: instructorImage(name) }))
      : DEFAULT_INSTRUCTORS,
    contact: DEFAULT_CONTACT,
  };
}

export default function CourseDetail() {
  const { slug } = useParams();
  const router = useRouter();
  const { openModal, isOpen } = useAuth();
  const [activePhase, setActivePhase] = useState(0);
  const pendingDemoRef = useRef(null);
  const prevIsOpenRef = useRef(false);

  // After modal closes, navigate to demo if user just logged in
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen && pendingDemoRef.current) {
      apiFetch('/api/auth/check', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          if (data.authenticated && data.user?.role === "student") {
            router.push(pendingDemoRef.current);
            pendingDemoRef.current = null;
          }
        })
        .catch(() => {});
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, router]);

  const handleDemoClick = async () => {
    try {
      const res = await apiFetch('/api/auth/check', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.authenticated && data.user?.role === "student") {
        router.push(`/courses/${slug}/demo`);
      } else {
        pendingDemoRef.current = `/courses/${slug}/demo`;
        openModal('login');
      }
    } catch {
      pendingDemoRef.current = `/courses/${slug}/demo`;
      openModal('login');
    }
  };

  const staticCourse = useMemo(() => {
    let found = courseDetailsData.find((c) => c.id === slug);
    if (!found) {
      for (const cat of categories) {
        const basic = cat.courses.find((c) => c.id === slug);
        if (basic) {
          found = {
            id: basic.id,
            title: basic.title,
            subtitle: `${basic.level} Specialization`,
            description: basic.desc,
            videoUrl: "",
            keyPoints: DEFAULT_KEYPOINTS,
            curriculum: DEFAULT_CURRICULUM,
            instructors: DEFAULT_INSTRUCTORS,
            contact: DEFAULT_CONTACT,
          };
          break;
        }
      }
    }
    return found;
  }, [slug]);

  // Admin-managed courses aren't in the static data — fetch and render the same
  // rich layout (default sections, overridable via courseDetails.json).
  const [adminCourse, setAdminCourse] = useState(null);
  useEffect(() => {
    if (staticCourse) { setAdminCourse(null); return; }
    let cancelled = false;
    fetch(`/api/public/courses/${slug}/`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setAdminCourse(mapAdminToDetail(d.course)); })
      .catch(() => { if (!cancelled) setAdminCourse(undefined); });
    return () => { cancelled = true; };
  }, [staticCourse, slug]);

  const course = staticCourse || adminCourse;

  if (!course) return <div className={styles.pageWrapper} />;

  return (
    <div className={styles.pageWrapper}>

      {/* ── Page-wide background layers ── */}
      <div className={styles.pageOrb1} aria-hidden="true" />
      <div className={styles.pageOrb2} aria-hidden="true" />
      <div className={styles.pageNoise} aria-hidden="true" />

      {/* ════════════════ HERO ════════════════ */}
      <section className={styles.hero}>
        {/* Background image — swap src per course when ready */}
        <div
          className={styles.heroBgImage}
          style={{ backgroundImage: `url(${course.heroImage || '/assets/courseBG.jpg'})` }}
          aria-hidden="true"
        />
        <div className={styles.heroBgOverlay} aria-hidden="true" />

        <div className={styles.heroContent}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.badge}
          >
            <Sparkles size={13} />
            {course.subtitle}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {course.title.split(' ').slice(0, -1).join(' ')}{' '}
            <span>{course.title.split(' ').slice(-1)}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
            className={styles.subtitle}
          >
            {course.description.substring(0, 160)}…
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className={styles.heroActions}
          >
            <EnrollButton courseId={course.id}
              courseTitle={course.title} price={course.price?.current || course.price} className={styles.heroPrimary}>
              Enroll Now <ArrowRight size={16} />
            </EnrollButton>
            <button onClick={handleDemoClick} className={styles.heroSecondary}>
              Free Demo Class
            </button>
          </motion.div>
        </div>
      </section>

      {/* ════════════════ VIDEO ════════════════ */}
      <section className={styles.videoSection}>
        <div className={styles.videoGlow} aria-hidden="true" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={styles.videoWrapper}
        >
          {(() => {
            const vid = (course.videoUrl && course.videoUrl !== "https://www.youtube.com/embed/placeholder")
              ? toEmbed(course.videoUrl)
              : "https://www.youtube.com/embed/79vZT-2rMLg";
            return (
              <iframe
                src={vid}
                title={course.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            );
          })()}
          {/* corner brackets */}
          <span className={styles.cTL} aria-hidden="true" />
          <span className={styles.cTR} aria-hidden="true" />
          <span className={styles.cBL} aria-hidden="true" />
          <span className={styles.cBR} aria-hidden="true" />
        </motion.div>
      </section>

      {/* ════════════════ MAIN GRID ════════════════ */}
      <div className={styles.mainGrid}>

        {/* ── Key Points ── */}
        <section className={styles.keyPointsSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}><span className={styles.eyebrowDot} />What You Gain</span>
            <h2>Our <span>Key Points</span></h2>
          </div>

          <div className={styles.pointsGrid}>
            {course.keyPoints.map((point, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                viewport={{ once: true }}
                className={styles.pointCard}
              >
                <span className={styles.cardGhost}>{String(idx + 1).padStart(2, '0')}</span>
                <div className={styles.cardTop}>
                  <div className={styles.icon}><CheckCircle2 size={17} /></div>
                </div>
                <h4>{point.text || point.title}</h4>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Roadmap + Sidebar ── */}
        <div className={styles.contentSplit}>

          <section className={styles.roadmapSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Curriculum</span>
              <h2>Program <span>Roadmap</span></h2>
            </div>

            <div className={styles.accordion}>
              {course.curriculum.map((item, idx) => (
                <div
                  key={idx}
                  className={`${styles.item} ${activePhase === idx ? styles.active : ''}`}
                >
                  <div
                    className={styles.header}
                    onClick={() => setActivePhase(activePhase === idx ? null : idx)}
                  >
                    <div className={styles.numBox}>{String(idx + 1).padStart(2, '0')}</div>
                    <h3>{item.title}</h3>
                    <div className={styles.toggleIcon}>
                      {activePhase === idx ? <Minus size={16} /> : <Plus size={16} />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {activePhase === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className={styles.body}
                      >
                        <p className={styles.content}>{item.content}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </section>

          <aside className={styles.sidebar}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={styles.demoCard}
            >
              <div className={styles.demoCardBg} aria-hidden="true" />
              <div className={styles.demoIcon}><Tv size={28} /></div>
              <h3>Free Demo Class</h3>
              <p>Experience our teaching methodology first-hand. Get a glimpse of the professional curriculum.</p>

              <button onClick={handleDemoClick} className={styles.demoBtn}>
                Watch Demo Class <ArrowRight size={15} />
              </button>

              <div className={styles.demoFeatures}>
                {['Instant Access', 'Curriculum Overview', 'Industry Insights'].map(f => (
                  <div key={f} className={styles.feature}>
                    <CheckCircle2 size={14} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </aside>

        </div>
      </div>

      {/* ════════════════ PHASES ════════════════ */}
      <CoursePhases />

      {/* ════════════════ FACULTY ════════════════ */}
      <section className={styles.instructorsSection}>
        <div className={styles.instructorsBg} aria-hidden="true" />
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Expert Guidance</span>
            <h2 className={styles.sectionTitle}>Meet Your <span>Mentors</span></h2>
          </div>

          <div className={styles.instructorsGrid}>
            {course.instructors && course.instructors.map((ins, idx) => (
              <Link
                key={idx}
                href={`/instructors/${mentorSlug(ins.name)}`}
                className={styles.instructorCard}
              >
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  viewport={{ once: true }}
                  className={styles.cardInner}
                >
                  <div className={styles.imgWrap}>
                    <img src={cldUrl(ins.image, { width: 200 })} alt={ins.name} loading="lazy" decoding="async" />
                    <div className={styles.imgOverlay} aria-hidden="true" />
                  </div>
                  <div className={styles.instructorInfo}>
                    <h4>{ins.name}</h4>
                    <span>Industry Expert</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ WHY NUVOSID ════════════════ */}
      <WhyNuvosid />

      {/* ════════════════ CTA ════════════════ */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBg} aria-hidden="true">
          <div className={styles.ctaOrb1} />
          <div className={styles.ctaOrb2} />
          <div className={styles.ctaGrid} />
        </div>

        <div className={styles.ctaInner}>
          <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Begin Your Journey</span>
          <h2>Master Your <span>Craft.</span></h2>
          <p>Our academic advisors are ready to help you navigate your career path in the design industry.</p>

          <div className={styles.ctaActions}>
            <EnrollButton courseId={course.id}
              courseTitle={course.title} price={course.price?.current || course.price} className={styles.ctaPrimary}>
              Start Enrolling <ArrowRight size={16} />
            </EnrollButton>
          </div>

          <div className={styles.contact}>
            <a href={`mailto:${course.contact.email}`} className={styles.cItem}>
              <Mail className={styles.cIcon} size={20} />
              <span>{course.contact.email}</span>
            </a>
            <a href={`tel:${course.contact.phone}`} className={styles.cItem}>
              <Phone className={styles.cIcon} size={20} />
              <span>{course.contact.phone}</span>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
