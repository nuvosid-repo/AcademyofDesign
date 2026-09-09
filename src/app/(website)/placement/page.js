"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Briefcase, TrendingUp, Award, Users, ArrowRight,
  Target, FileText, MessageSquare, Handshake, CheckCircle2,
  Building2, Star, Quote,
} from "lucide-react";
import Testimonials from "@/components/Testimonials/Testimonials";
import styles from "./Placement.module.scss";

/* ─── Data ─────────────────────────────────────────── */
const STATS = [
  { icon: TrendingUp, value: "98%",   label: "Placement Rate",  accent: "#db254f" },
  { icon: Award,      value: "₹12 LPA", label: "Highest Package", accent: "#f5a623" },
  { icon: Building2,  value: "300+",   label: "Hiring Partners", accent: "#2dd4bf" },
  { icon: Briefcase,  value: "1.2k+",  label: "Students Placed", accent: "#a78bfa" },
];

const PARTNERS = [
  "Google", "Amazon", "Microsoft", "Meta", "Adobe", "Figma",
  "Nike", "Adidas", "Canva", "TCS", "Infosys", "Wipro",
];

const PROCESS = [
  {
    icon: Target,
    num: "01",
    title: "Career Mapping",
    desc: "One-on-one sessions to identify your strengths, niche, and the design roles best suited to your ambitions.",
    accent: "#38bdf8",
  },
  {
    icon: FileText,
    num: "02",
    title: "Portfolio & Resume",
    desc: "Expert-led portfolio reviews and resume building so your work speaks louder than any interview.",
    accent: "#2dd4bf",
  },
  {
    icon: MessageSquare,
    num: "03",
    title: "Interview Coaching",
    desc: "Mock interviews, design challenges, and salary negotiation training with industry mentors.",
    accent: "#f5a623",
  },
  {
    icon: Handshake,
    num: "04",
    title: "Partner Introductions",
    desc: "Warm referrals and direct introductions to 300+ studios, agencies, and product companies.",
    accent: "#a78bfa",
  },
];

const STORIES = [
  {
    name: "Aarav Mehta",
    role: "Product Designer",
    company: "Google",
    quote: "Nuvosid completely changed how I approach design. The mentorship and placement team got me into my dream role within weeks of graduating.",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop",
    accent: "#2dd4bf",
  },
  {
    name: "Isha Kapoor",
    role: "Art Director",
    company: "Nike",
    quote: "The curriculum is perfectly aligned with what the industry actually needs. Every project I built became a portfolio piece that hiring managers loved.",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop",
    accent: "#f5a623",
  },
  {
    name: "Rohan Verma",
    role: "Fashion Designer",
    company: "Adidas",
    quote: "I learned not just skills, but how to think like a designer. The interview coaching gave me the confidence to negotiate a package I never imagined.",
    img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop",
    accent: "#a78bfa",
  },
];

/* ─── Motion helpers ───────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

/* ─── Component ────────────────────────────────────── */
export default function PlacementPage() {
  return (
    <div className={styles.pageWrapper}>

      {/* ── Page-wide background layers ── */}
      <div className={styles.pageNoise} aria-hidden="true" />
      <div className={styles.pageOrb1} aria-hidden="true" />
      <div className={styles.pageOrb2} aria-hidden="true" />

      {/* ════════════════ HERO ════════════════ */}
      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroContent}>
          <motion.span
            className={styles.badge}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Briefcase size={13} /> Career Outcomes
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Industry <span>Placement.</span>
          </motion.h1>

          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
          >
            Our commitment doesn&apos;t end with education. We place our students in
            world-class design studios, creative agencies, and product companies — globally.
          </motion.p>

          <motion.div
            className={styles.heroActions}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            <Link href="/enroll" className={styles.heroPrimary}>
              Start Your Journey <ArrowRight size={16} />
            </Link>
            <Link href="/courses" className={styles.heroSecondary}>
              Explore Programs
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════════════ STATS BAND ════════════════ */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              className={styles.statCard}
              style={{ "--accent": s.accent }}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08 }}
            >
              <div className={styles.statIcon}><s.icon size={20} /></div>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ════════════════ HIRING PARTNERS ════════════════ */}
      <section className={styles.partnersSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Where Our Alumni Work</span>
            <h2>Top Hiring <span>Partners</span></h2>
          </div>

          <div className={styles.partnersGrid}>
            {PARTNERS.map((company, i) => (
              <motion.div
                key={i}
                className={styles.partnerCard}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.5 }}
              >
                <span>{company}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ PLACEMENT PROCESS ════════════════ */}
      <section className={styles.processSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}><span className={styles.eyebrowDot} />How It Works</span>
            <h2>Our Placement <span>Process</span></h2>
          </div>

          <div className={styles.processGrid}>
            {PROCESS.map((step, i) => (
              <motion.div
                key={i}
                className={styles.processCard}
                style={{ "--accent": step.accent }}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1 }}
              >
                <span className={styles.processGhost}>{step.num}</span>
                <div className={styles.processIcon}><step.icon size={22} /></div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ SUCCESS STORIES ════════════════ */}
      <section className={styles.storiesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Real Outcomes</span>
            <h2>Success <span>Stories</span></h2>
          </div>

          <div className={styles.storiesGrid}>
            {STORIES.map((story, i) => (
              <motion.div
                key={i}
                className={styles.storyCard}
                style={{ "--accent": story.accent }}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1 }}
              >
                <Quote className={styles.storyQuoteIcon} size={28} />
                <p className={styles.storyQuote}>&ldquo;{story.quote}&rdquo;</p>

                <div className={styles.storyFooter}>
                  <img src={story.img} alt={story.name} className={styles.storyImg} />
                  <div className={styles.storyMeta}>
                    <h4>{story.name}</h4>
                    <span className={styles.storyRole}>
                      {story.role} <em>@ {story.company}</em>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ TESTIMONIALS ════════════════ */}
      <Testimonials
        title="Placed. Thriving. Inspiring."
        subtitle="Our alumni are building the future of design at some of the world's most respected companies."
        accentColor="#db254f"
      />

      {/* ════════════════ CTA ════════════════ */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBg} aria-hidden="true">
          <div className={styles.ctaOrb} />
          <div className={styles.ctaGrid} />
        </div>
        <div className={styles.ctaInner}>
          <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Your Career Starts Here</span>
          <h2>Ready to Get <span>Placed?</span></h2>
          <p>Join a program backed by dedicated placement support and a network of 300+ hiring partners.</p>
          <Link href="/enroll" className={styles.ctaPrimary}>
            Enroll Now <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </div>
  );
}
