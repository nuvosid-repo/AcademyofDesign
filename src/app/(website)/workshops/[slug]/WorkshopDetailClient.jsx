"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar, MapPin, Clock, ArrowLeft, ArrowRight, PlayCircle,
  CheckCircle2, Sparkles, Mic, GraduationCap,
} from "lucide-react";
import Testimonials from "@/components/Testimonials/Testimonials";
import WorkshopsCertificate from "@/components/Workshops/WorkshopsCertificate";
import WorkshopRegistration from "@/components/Workshops/WorkshopRegistration";
import styles from "@/components/Workshops/Workshops.module.scss";
import workshopsList from "@/data/workshops.json";

// Convert a YouTube / Vimeo / direct URL into an iframe-embeddable URL.
function toEmbed(url) {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

export default function WorkshopDetailPage() {
  const { slug } = useParams();

  // Fetch the admin-managed workshop; fall back to the static bundle if the
  // API has nothing for this slug (keeps old links / offline dev working).
  const [workshop, setWorkshop] = useState(null);
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/workshops/${slug}/`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) { setWorkshop(d.workshop); setResolved(true); } })
      .catch(() => { if (!cancelled) { setWorkshop(workshopsList.find((w) => w.id === slug) || null); setResolved(true); } });
    return () => { cancelled = true; };
  }, [slug]);

  if (!resolved) return <div className={styles.pageWrapper} />;

  if (!workshop) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.notFound}>
          <h1>Workshop not found</h1>
          <p>The masterclass you&apos;re looking for doesn&apos;t exist or has been moved.</p>
          <Link href="/workshops" className={styles.backCta}>
            <ArrowLeft size={16} /> Back to all workshops
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* ── Hero Banner ── */}
      <section className={styles.detailHero}>
        <div
          className={styles.detailHeroImage}
          style={{ backgroundImage: `url(${workshop.image})` }}
          aria-hidden="true"
        />
        <div className={styles.detailHeroOverlay} aria-hidden="true" />

        <div className="container position-relative" style={{ zIndex: 5 }}>
          <Link href="/workshops" className={styles.backLink}>
            <ArrowLeft size={15} /> All Workshops
          </Link>

          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.detailCat}
          >
            {workshop.category}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={styles.detailTitle}
          >
            {workshop.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className={styles.detailSubtitle}
          >
            {workshop.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className={styles.detailMeta}
          >
            <span><Calendar size={15} /> {workshop.date}</span>
            <span><Clock size={15} /> {workshop.time}</span>
            <span><MapPin size={15} /> {workshop.location}</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className={styles.detailActions}
          >
            <div className={styles.detailPrice}>
              <span className={styles.current}>{workshop.price}</span>
              <span className={styles.original}>{workshop.originalPrice}</span>
            </div>
            <a href="#register" className={styles.registerCta}>
              Register Now <ArrowRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Intro Video ── */}
      {workshop.videoUrl && (
        <section className={styles.videoSection}>
          <div className={styles.videoGlow} aria-hidden="true" />
          <div className="container position-relative" style={{ zIndex: 5 }}>
            <div className={styles.videoHead}>
              <span className={styles.eyebrow}>
                <span className={styles.dot} /> <PlayCircle size={13} /> Workshop Intro
              </span>
              <h2>Watch the Preview</h2>
              {workshop.videoCaption && <p>{workshop.videoCaption}</p>}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={styles.videoWrapper}
            >
              <iframe
                src={toEmbed(workshop.videoUrl)}
                title={workshop.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Details ── */}
      <section className={styles.detailContent}>
        <div className="container position-relative" style={{ zIndex: 5 }}>
          {/* Info highlights */}
          <div className={styles.infoHighlights}>
            <div className={styles.infoCard}>
              <span className={styles.infoIcon}><Calendar size={18} /></span>
              <span className={styles.infoText}>
                <span className={styles.infoLabel}>Date</span>
                <span className={styles.infoValue}>{workshop.date}</span>
              </span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoIcon}><Clock size={18} /></span>
              <span className={styles.infoText}>
                <span className={styles.infoLabel}>Time</span>
                <span className={styles.infoValue}>{workshop.time}</span>
              </span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoIcon}><MapPin size={18} /></span>
              <span className={styles.infoText}>
                <span className={styles.infoLabel}>Location</span>
                <span className={styles.infoValue}>{workshop.location}</span>
              </span>
            </div>
          </div>

          <div className="row g-4">
            {/* Main column */}
            <div className="col-12 col-lg-8">
              <div className={styles.infoStack}>
                {/* What You'll Learn */}
                {workshop.keynotes?.length > 0 && (
                  <div className={styles.blockCard}>
                    <div className={styles.blockHead}>
                      <span className={styles.blockEyebrow}>
                        <span className={styles.dot} /> <Sparkles size={13} /> Outcomes
                      </span>
                      <h2>What You&apos;ll Learn</h2>
                    </div>
                    <div className={styles.keynoteGrid}>
                      {workshop.keynotes.map((point, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 16 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-40px" }}
                          transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className={styles.keynoteCard}
                        >
                          <span className={styles.keynoteCheck}><CheckCircle2 size={18} /></span>
                          <span>{point}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Schedule */}
                {workshop.schedule?.length > 0 && (
                  <div className={styles.blockCard}>
                    <div className={styles.blockHead}>
                      <span className={styles.blockEyebrow}>
                        <span className={styles.dot} /> <Clock size={13} /> Agenda
                      </span>
                      <h2>Event Schedule</h2>
                    </div>
                    <div className={styles.timeline2}>
                      {workshop.schedule.map((slot, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -12 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, margin: "-40px" }}
                          transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className={styles.tlItem}
                        >
                          <div className={styles.tlMarker}>
                            <span className={styles.tlDot} />
                          </div>
                          <div className={styles.tlContent}>
                            <span className={styles.tlTime}>{slot.time}</span>
                            <p className={styles.tlActivity}>{slot.activity}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Speaker sidebar */}
            {workshop.speaker && (
              <div className="col-12 col-lg-4">
                <div className={styles.speakerCard}>
                  <div className={styles.speakerAvatar}>
                    <img src={workshop.speaker.image} alt={workshop.speaker.name} />
                  </div>
                  <span className={styles.speakerBadge}>
                    <Mic size={12} /> Lead Speaker
                  </span>
                  <h3>{workshop.speaker.name}</h3>
                  <div className={styles.speakerRole}>{workshop.speaker.designation}</div>
                  {workshop.speaker.credentials && (
                    <div className={styles.speakerCredsRow}>
                      <GraduationCap size={14} /> {workshop.speaker.credentials}
                    </div>
                  )}
                  <p className={styles.speakerBioText}>{workshop.speaker.bio}</p>
                  <a href="#register" className={styles.speakerCta}>
                    Reserve Your Seat <ArrowRight size={15} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Certificate ── */}
      <WorkshopsCertificate workshop={workshop} />

      {/* ── Registration ── */}
      <section id="register" className={styles.registerSection}>
        <div className={styles.bgGlow1} />
        <div className="container position-relative" style={{ zIndex: 10 }}>
          <div className={styles.consoleCard}>
            <div className={styles.detailsBody}>
              <WorkshopRegistration workshop={workshop} />
            </div>
          </div>
        </div>
      </section>

      <Testimonials
        title="Workshop Success Stories"
        subtitle="Hear from designers who levelled up their skills through our intensive workshops."
        accentColor="#db254f"
      />
    </div>
  );
}
