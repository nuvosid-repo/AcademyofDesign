'use client';

import { useParams, useRouter } from 'next/navigation';
import { cldUrl } from '@/lib/img';
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import {
  Play, CheckCircle2, Plus, Minus, X,
  Award, Download, Lock, ArrowRight, FileText
} from 'lucide-react';
import Link from 'next/link';
import EnrollButton from '@/components/Payment/EnrollButton';
import styles from './DemoClass.module.scss';
import courseDetailsData from '@/data/courseDetails.json';
import categories from '@/data/courses.json';

// Default demo sections used when a course has no static courseDetails.json entry.
const DEMO_KEYPOINTS = [
  { text: "Comprehensive Training with Latest Tools" },
  { text: "Mentorship by Top Industry Experts" },
  { text: "Weekly Live Doubt Clearing Sessions" },
  { text: "Personalised Feedbacks & Reports" },
  { text: "Multiple Live Projects From Different Industries" },
  { text: "Career Guidance Counselling Sessions" },
  { text: "Pro Learning Material, E-books and Excel Sheets" },
  { text: "Flexible Payment Options with Zero Interest" },
  { text: "Personalised Learning Experience in Small Groups" },
];
const DEMO_CURRICULUM = [
  { title: "Course Duration", content: "Comprehensive program with intensive training sessions and practical workshops." },
  { title: "Course Content", content: "In-depth modules covering core concepts, industry tools, practical applications, and real-world project work." },
  { title: "List Of Live Projects With Course", content: "Apply your skills on real-world projects from different industries to build a professional portfolio." },
];
const DEMO_INSTRUCTORS = [
  { name: "Siddharth Sharma", designation: "B.Tech Civil, M.Tech Structures", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop" },
  { name: "Shantanu Sharma", designation: "B.Arch, M. Arch", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop" },
  { name: "Manan Agrawal", designation: "B.Tech Computer Science", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop" },
  { name: "Kritik Kothari", designation: "Promotor & Growth Partner", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=300&auto=format&fit=crop" },
  { name: "A.K. Sharma", designation: "Chartered Engineer", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop" },
];
const DEMO_PRICE = { original: "₹15,000", current: "₹11,250", discount: "25% OFF" };
const DEMO_CONTACT = { email: "academy@nuvosid.design", phone: "+91 9929943246" };

// Convert a YouTube / Vimeo / direct URL into an iframe-embeddable URL.
function toEmbed(url) {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

function mapAdminToDemo(ac) {
  return {
    id: ac.id,
    title: ac.title,
    subtitle: ac.category || "Course",
    description: ac.overview || ac.shortDescription || "",
    videoUrl: ac.demoVideo || "",
    keyPoints: DEMO_KEYPOINTS,
    curriculum: DEMO_CURRICULUM,
    instructors: (ac.instructors && ac.instructors.length)
      ? ac.instructors.map((name) => ({
          name,
          designation: "Industry Expert",
          image: DEMO_INSTRUCTORS.find((d) => d.name.toLowerCase() === name.toLowerCase())?.image || DEMO_INSTRUCTORS[0].image,
        }))
      : DEMO_INSTRUCTORS,
    price: ac.price ? { original: `₹${ac.price}`, current: `₹${ac.price}`, discount: "" } : DEMO_PRICE,
    contact: DEMO_CONTACT,
  };
}

// Premium scroll-based animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 35 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } 
  }
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } 
  }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } 
  }
};

const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1
    }
  }
};

const childFadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } 
  }
};

export default function DemoClassPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { openModal, isOpen } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState(0);
  const [showCertModal, setShowCertModal] = useState(false);
  const prevIsOpenRef = useRef(false);

  // Initial auth check — auto-opens modal if not authenticated
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await apiFetch('/api/auth/check', { method: 'GET' });
        const data = await res.json();
        if (!cancelled) {
          if (res.ok && data.authenticated && data.user?.role === "student") {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            openModal('login');
          }
          setAuthChecked(true);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          setAuthChecked(true);
          openModal('login');
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [openModal]);

  // Re-check auth whenever the modal closes (login may have succeeded)
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      apiFetch('/api/auth/check')
        .then(r => r.json())
        .then(data => { if (data.authenticated && data.user?.role === "student") setIsAuthenticated(true); })
        .catch(() => {});
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Load course data
  const staticCourse = useMemo(() => {
    let found = courseDetailsData.find((c) => c.id === slug);
    if (!found) {
      for (const cat of categories) {
        const basic = cat.courses.find(c => c.id === slug);
        if (basic) {
          found = {
            id: basic.id,
            title: basic.title,
            subtitle: `${basic.level} Specialization`,
            description: basic.desc,
            videoUrl: "",
            keyPoints: [
              { text: "Comprehensive Training with Latest Tools" },
              { text: "Mentorship by Top Industry Experts" },
              { text: "Weekly Live Doubt Clearing Sessions" },
              { text: "Personalised Feedbacks & Reports" },
              { text: "Multiple Live Projects From Different Industries" },
              { text: "Career Guidance Counselling Sessions" },
              { text: "Pro Learning Material, E-books and Excel Sheets" },
              { text: "Flexible Payment Options with Zero Interest" },
              { text: "Personalised Learning Experience in Small Groups" }
            ],
            curriculum: [
              { title: "Course Duration", content: `Comprehensive ${basic.duration} program with intensive training sessions and practical workshops.` },
              { title: "Course Content", content: "In-depth modules covering core concepts, industry tools, practical applications, and real-world project work." },
              { title: "List Of Live Projects With Course", content: "Apply your skills on real-world projects from different industries to build a professional portfolio." }
            ],
            instructors: [
              { name: "Siddharth Sharma", designation: "B.Tech Civil, M.Tech Structures", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop" },
              { name: "Shantanu Sharma", designation: "B.Arch, M. Arch", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop" },
              { name: "Manan Agrawal", designation: "B.Tech Computer Science", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop" },
              { name: "Kritik Kothari", designation: "Promotor & Growth Partner", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=300&auto=format&fit=crop" },
              { name: "A.K. Sharma", designation: "Chartered Engineer", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop" }
            ],
            price: { original: "₹15,000", current: "₹11,250", discount: "25% OFF" },
            contact: { email: "academy@nuvosid.design", phone: "+91 9929943246" }
          };
          break;
        }
      }
    } else {
      // Enhance the existing courseDetails data with extra fields if missing
      found = {
        ...found,
        instructors: (found.instructors || []).map(ins => ({
          ...ins,
          designation: ins.designation || "Industry Expert"
        })),
        price: found.price || { original: "₹15,000", current: "₹11,250", discount: "25% OFF" }
      };
    }
    return found;
  }, [slug]);

  // Admin-managed courses aren't in the static data — fetch and render the same demo.
  const [adminCourse, setAdminCourse] = useState(null);
  useEffect(() => {
    if (staticCourse) { setAdminCourse(null); return; }
    let cancelled = false;
    fetch(`/api/public/courses/${slug}/`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setAdminCourse(mapAdminToDemo(d.course)); })
      .catch(() => { if (!cancelled) setAdminCourse(undefined); });
    return () => { cancelled = true; };
  }, [staticCourse, slug]);

  const course = staticCourse || adminCourse;

  if (!authChecked) {
    return <div className={styles.pageWrapper}></div>;
  }

  // Login gate
  if (!isAuthenticated) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.bgGlow} />
        <div className={styles.loginGate}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className={styles.loginCard}
          >
            <div className={styles.lockIcon}>
              <Lock size={36} />
            </div>
            <h2>Login Required</h2>
            <p>Please sign in to your account to access the free demo class and explore our premium course content.</p>
            <button onClick={() => openModal('login')} className={styles.loginBtn}>
              Sign In to Continue <ArrowRight size={18} />
            </button>
            <Link href={`/courses/${slug}`} className={styles.backText}>
              ← Back to Course Details
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!course) return <div className={styles.pageWrapper}></div>;

  return (
    <div className={styles.pageWrapper}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div
          className={styles.heroBgImage}
          style={{ backgroundImage: `url(${course.heroImage || '/assets/courseBG.jpg'})` }}
          aria-hidden="true"
        />
        <div className={styles.heroBgOverlay} aria-hidden="true" />

        <div className={styles.heroContent}>
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={styles.badge}
          >
            <Play size={12} fill="currentColor" /> Free Demo Class
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {course.title.split(' ').slice(0, -1).join(' ')}{' '}
            <span>{course.title.split(' ').slice(-1)}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={styles.heroSubtitle}
          >
            {course.subtitle || 'Experience our teaching methodology first-hand'}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.7 }}
            className={styles.heroScroll}
          >
            <span />
          </motion.div>
        </div>
      </section>

      {/* ── Video ── */}
      <section className={styles.videoSection}>
        <div className={styles.videoGlow} aria-hidden="true" />
        <motion.div
          variants={fadeInScale}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className={styles.videoWrapper}
        >
          {(() => {
            const vid = (course.videoUrl && course.videoUrl !== "" && course.videoUrl !== "https://www.youtube.com/embed/placeholder")
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
          <span className={styles.cTL} aria-hidden="true" />
          <span className={styles.cTR} aria-hidden="true" />
          <span className={styles.cBL} aria-hidden="true" />
          <span className={styles.cBR} aria-hidden="true" />
        </motion.div>
      </section>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.splitLayout}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            {/* Description */}
            <motion.section
              variants={slideInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className={styles.descriptionSection}
            >
              <h2>{course.highlightTitle || course.title}</h2>
              <p>{course.highlightDescription || course.description}</p>
            </motion.section>

            {/* Key Points */}
            <section className={styles.keyPointsSection}>
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={styles.sectionLabel}
              >
                <h2>Our <span>Key Points</span></h2>
                <div className={styles.line} />
              </motion.div>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                className={styles.pointsGrid}
              >
                {course.keyPoints.map((point, idx) => (
                  <motion.div
                    key={idx}
                    variants={childFadeIn}
                    className={styles.pointCard}
                  >
                    <span className={styles.cardGhost}>{String(idx + 1).padStart(2, '0')}</span>
                    <div className={styles.icon}><CheckCircle2 size={16} /></div>
                    <h4>{point.text || point.title}</h4>
                  </motion.div>
                ))}
              </motion.div>
            </section>

            {/* Left Enrollment CTA */}
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className={styles.leftEnrollSection}
            >
              <EnrollButton courseId={course.id}
                courseTitle={course.title} price={course.price?.current || course.price?.original} className={styles.leftEnrollBtn}>
                Enroll Now and get {course.price?.discount || '25% OFF'} on the course <ArrowRight size={18} />
              </EnrollButton>
              <div className={styles.leftPriceCard}>
                <span className={styles.label}>Course Fees:</span>
                <div className={styles.prices}>
                  <span className={styles.old}>{course.price?.original || '₹15,000.00'}</span>
                  <span className={styles.current}>{course.price?.current || '₹11,250.00'}</span>
                </div>
                <span className={styles.tag}>{course.price?.discount || '25% OFF'}</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className={styles.rightColumn}>
            {/* Instructors */}
            <motion.div
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className={styles.instructorsCard}
            >
              <h3 className={styles.cardTitle}>Course Instructors</h3>
              <div className={styles.instructorsGrid}>
                {course.instructors && course.instructors.map((ins, idx) => (
                  <div key={idx} className={styles.instructorItem}>
                    <div className={styles.imgWrap}>
                      <img src={cldUrl(ins.image, { width: 200 })} alt={ins.name} loading="lazy" decoding="async" />
                    </div>
                    <div className={styles.name}>{ins.name}</div>
                    <div className={styles.designation}>{ins.designation || 'Industry Expert'}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Course Details Accordion */}
            <motion.div
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className={styles.detailsCard}
            >
              <h3 className={styles.cardTitle}>Course Details</h3>
              <div className={styles.accordion}>
                {course.curriculum.map((item, idx) => (
                  <div
                    key={idx}
                    className={`${styles.accordionItem} ${activeAccordion === idx ? styles.active : ''}`}
                  >
                    <div
                      className={styles.accordionHeader}
                      onClick={() => setActiveAccordion(activeAccordion === idx ? null : idx)}
                    >
                      <div className={styles.numBox}>{idx + 1}</div>
                      <h3>{item.title}</h3>
                      <div className={styles.toggleIcon}>
                        {activeAccordion === idx ? <Minus size={16} /> : <Plus size={16} />}
                      </div>
                    </div>
                    <AnimatePresence>
                      {activeAccordion === idx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className={styles.accordionBody}
                        >
                          <div className={styles.accordionContent}>
                            {item.content}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Actions: Certificate + Syllabus */}
            <motion.div
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className={styles.actionsCard}
            >
              <button className={styles.certBtn} onClick={() => setShowCertModal(true)}>
                <Award size={18} /> View Sample Certificate
              </button>
              <button className={styles.syllabusBtn}>
                <Download size={18} /> Download Syllabus
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Enroll CTA */}
      <section className={styles.enrollSection}>
        <motion.div
          variants={fadeInScale}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className={styles.enrollCard}
        >
          <div className={styles.ctaOrb1} aria-hidden="true" />
          <div className={styles.ctaOrb2} aria-hidden="true" />
          <h2>Enroll Now & <span>Get Started</span></h2>
          <p className={styles.enrollSubtitle}>
            Take the next step towards mastering your craft. Enroll today and get exclusive access to industry-grade training.
          </p>
          <div className={styles.priceRow}>
            <span className={styles.originalPrice}>{course.price?.original || '₹15,000'}</span>
            <span className={styles.currentPrice}>{course.price?.current || '₹11,250'}</span>
            <span className={styles.discount}>{course.price?.discount || '25% OFF'}</span>
          </div>
          <EnrollButton courseId={course.id}
                courseTitle={course.title} price={course.price?.current || course.price?.original} className={styles.enrollBtn}>
            Enroll Now <ArrowRight size={18} />
          </EnrollButton>
        </motion.div>
      </section>

      {/* Back link */}
      <div className={styles.backLink}>
        <Link href={`/courses/${slug}`}>← Back to Course Details</Link>
      </div>

      {/* Certificate Modal */}
      <AnimatePresence>
        {showCertModal && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCertModal(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>Sample Certificate</h3>
                <button className={styles.closeBtn} onClick={() => setShowCertModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.modalBody}>
                {/* Replace with actual certificate image when uploaded */}
                <div className={styles.certPlaceholder}>
                  <div className={styles.certIcon}><Award size={40} /></div>
                  <p>Certificate preview will appear here</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
