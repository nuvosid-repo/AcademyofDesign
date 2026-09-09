"use client";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Award, GraduationCap, BadgeCheck, Briefcase,
  Sparkles, PlayCircle, Plus, Minus, CheckCircle2, Clock, BookOpen, Layers,
} from "lucide-react";
import styles from "@/components/Instructors/Instructors.module.scss";
import instructorsList from "@/data/instructors.json";
import courseCategories from "@/data/courses.json";

// Flat lookup of every course by id so we can enrich a mentor's course links
// with the real image, duration and level.
const COURSE_MAP = courseCategories
  .flatMap((cat) => cat.courses || [])
  .reduce((map, course) => {
    map[course.id] = course;
    return map;
  }, {});

export default function MentorDetailClient() {
  const { slug } = useParams();
  const [openIdx, setOpenIdx] = useState(0);

  const mentor = useMemo(
    () => instructorsList.find((m) => m.slug === slug),
    [slug]
  );

  if (!mentor) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.notFound}>
          <h1>Mentor not found</h1>
          <p>The profile you&apos;re looking for doesn&apos;t exist or has been moved.</p>
          <Link href="/instructors" className={styles.backCta}>
            <ArrowLeft size={16} /> Back to all mentors
          </Link>
        </div>
      </div>
    );
  }

  const details = mentor.details || [];

  return (
    <div className={styles.pageWrapper}>
      {/* ── Hero Banner ── */}
      <section className={styles.detailHero}>
        <div
          className={styles.detailHeroImage}
          style={{ backgroundImage: `url(${mentor.image})` }}
          aria-hidden="true"
        />
        <div className={styles.detailHeroOverlay} aria-hidden="true" />
        <div className={styles.detailHeroGrid} aria-hidden="true" />

        <div className="container position-relative" style={{ zIndex: 5 }}>
          <Link href="/instructors" className={styles.backLink}>
            <ArrowLeft size={15} /> All Mentors
          </Link>

          <div className={styles.detailHeroInner}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={styles.heroPortrait}
            >
              <img src={mentor.image} alt={mentor.name} />
              {mentor.experience && (
                <span className={styles.heroPortraitExp}>
                  <Briefcase size={13} /> {mentor.experience}
                </span>
              )}
            </motion.div>

            <div className={styles.heroInfo}>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.detailRole}
              >
                {mentor.role}
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={styles.detailName}
              >
                {mentor.name}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.7 }}
                className={styles.detailDesignation}
              >
                {mentor.designation}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26, duration: 0.7 }}
                className={styles.detailChips}
              >
                {mentor.credentials.map((cred, i) => (
                  <span key={i} className={styles.detailChip}>
                    <GraduationCap size={13} /> {cred}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="container position-relative" style={{ zIndex: 5 }}>
        <div className={styles.detailBody}>
          {/* About */}
          <section className={styles.aboutSection}>
            <span className={styles.sectionEyebrow}>
              <span className={styles.dot} /> About
            </span>
            <h2 className={styles.sectionTitle}>Meet {mentor.name.split(" ")[0]}</h2>
            <p className={styles.aboutText}>{mentor.bio}</p>

            {/* Experience highlight band */}
            <div className={styles.statBand}>
              {mentor.experience && (
                <div className={`${styles.statTile} ${styles.statTileAccent}`}>
                  <span className={styles.statTileIcon}><Briefcase size={20} /></span>
                  <span className={styles.statTileText}>
                    <span className={styles.statTileVal}>{mentor.experience}</span>
                    <span className={styles.statTileLbl}>Industry Experience</span>
                  </span>
                </div>
              )}
              {mentor.courses?.length > 0 && (
                <div className={styles.statTile}>
                  <span className={styles.statTileIcon}><BookOpen size={20} /></span>
                  <span className={styles.statTileText}>
                    <span className={styles.statTileVal}>{mentor.courses.length}</span>
                    <span className={styles.statTileLbl}>Programs Led</span>
                  </span>
                </div>
              )}
              {mentor.expertise?.length > 0 && (
                <div className={styles.statTile}>
                  <span className={styles.statTileIcon}><Layers size={20} /></span>
                  <span className={styles.statTileText}>
                    <span className={styles.statTileVal}>{mentor.expertise.length}+</span>
                    <span className={styles.statTileLbl}>Specializations</span>
                  </span>
                </div>
              )}
            </div>

            {(mentor.memberships?.length > 0 || mentor.expertise?.length > 0) && (
              <div className={styles.quickTags}>
                {mentor.memberships?.map((mem, i) => (
                  <span key={`m-${i}`} className={styles.quickTag}>
                    <BadgeCheck size={13} /> {mem}
                  </span>
                ))}
                {mentor.expertise?.map((skill, i) => (
                  <span key={`e-${i}`} className={styles.quickTagAlt}>
                    <Sparkles size={13} /> {skill}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Intro Video */}
          {mentor.videoUrl && (
            <section className={styles.videoSection}>
              <span className={styles.sectionEyebrow}>
                <span className={styles.dot} /> <PlayCircle size={14} /> Intro Video
              </span>
              <h2 className={styles.sectionTitle}>A Word From {mentor.name.split(" ")[0]}</h2>
              {mentor.videoCaption && <p className={styles.sectionSub}>{mentor.videoCaption}</p>}

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={styles.videoFrame}
              >
                <iframe
                  src={mentor.videoUrl}
                  title={`${mentor.name} — intro`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </motion.div>
            </section>
          )}

          {/* Accordion details */}
          {details.length > 0 && (
            <section className={styles.detailsSection}>
              <span className={styles.sectionEyebrow}>
                <span className={styles.dot} /> Profile
              </span>
              <h2 className={styles.sectionTitle}>Background & Track Record</h2>

              <div className={styles.accordion}>
                {details.map((item, idx) => {
                  const isOpen = openIdx === idx;
                  return (
                    <div
                      key={idx}
                      className={`${styles.accItem} ${isOpen ? styles.accActive : ""}`}
                    >
                      <button
                        type="button"
                        className={styles.accHead}
                        onClick={() => setOpenIdx(isOpen ? null : idx)}
                        aria-expanded={isOpen}
                      >
                        <span className={styles.accNum}>{idx + 1}</span>
                        <span className={styles.accTitle}>{item.title}</span>
                        <span className={styles.accToggle}>
                          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
                            className={styles.accBody}
                          >
                            <div className={styles.accBodyInner}>
                              {item.variant === "paragraph" && (
                                <p className={styles.accParagraph}>{item.content}</p>
                              )}

                              {item.variant === "bullets" && (
                                <ul className={styles.accBullets}>
                                  {item.items.map((li, i) => (
                                    <li key={i}>
                                      <CheckCircle2 size={16} />
                                      <span>{li}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {item.variant === "tags" && (
                                <div className={styles.accTags}>
                                  {item.items.map((tag, i) => (
                                    <span key={i} className={styles.accTag}>{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Courses */}
          {mentor.courses?.length > 0 && (
            <section className={styles.coursesSection}>
              <span className={styles.sectionEyebrow}>
                <span className={styles.dot} /> Programs
              </span>
              <h2 className={styles.sectionTitle}>
                Programs Led by {mentor.name.split(" ")[0]}
              </h2>
              <p className={styles.sectionSub}>
                Courses personally designed and mentored by {mentor.name.split(" ")[0]} at Nuvosid.
              </p>
              <div className={styles.courseGrid}>
                {mentor.courses.map((course) => {
                  const full = COURSE_MAP[course.id] || {};
                  const title = full.title || course.title;
                  return (
                    <Link key={course.id} href={`/courses/${course.id}`} className={styles.courseCard}>
                      <div className={styles.courseCardImg}>
                        {full.image ? (
                          <img src={full.image} alt={title} />
                        ) : (
                          <span className={styles.courseCardFallback}><Award size={26} /></span>
                        )}
                        {full.level && <span className={styles.courseCardBadge}>{full.level}</span>}
                        <span className={styles.courseCardShade} aria-hidden="true" />
                      </div>
                      <div className={styles.courseCardBody}>
                        <span className={styles.courseCardTag}><BookOpen size={12} /> Program</span>
                        <h3>{title}</h3>
                        <div className={styles.courseCardMeta}>
                          {full.duration && <span><Clock size={13} /> {full.duration}</span>}
                        </div>
                        <span className={styles.courseCardCta}>
                          View Course <ArrowRight size={15} />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
