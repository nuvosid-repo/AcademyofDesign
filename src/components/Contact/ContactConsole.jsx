"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Send, 
  Check, 
  Loader2 
} from "lucide-react";
import styles from "./Contact.module.scss";

const socialIconsList = [
  {
    name: "facebook",
    href: "https://facebook.com",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    )
  },
  {
    name: "twitter",
    href: "https://twitter.com",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
      </svg>
    )
  },
  {
    name: "instagram",
    href: "https://instagram.com",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
      </svg>
    )
  },
  {
    name: "youtube",
    href: "https://youtube.com",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
      </svg>
    )
  },
  {
    name: "linkedin",
    href: "https://linkedin.com",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
        <rect width="4" height="12" x="2" y="9"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    )
  }
];

export default function ContactConsole() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Phone/contact fields: digits only, max 10.
    const next = (name === "phone" || name === "contactNumber")
      ? value.replace(/\D/g, "").slice(0, 10)
      : value;
    setFormData({
      ...formData,
      [name]: next
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Dynamic Mock Form submission duration
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        message: ""
      });
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.8 }}
      className={styles.contactCardWrapper}
    >
      <div className="row g-4 g-lg-5 align-items-stretch">
        
        {/* Left Column: Contact Information */}
        <div className="col-12 col-lg-5">
          <div className={styles.infoPanel}>
            <div className={styles.panelHeader}>
              <h2>Contact Information</h2>
              <p>We&apos;re excited to hear from you!</p>
            </div>

            <div className={styles.detailsList}>
              <a href="tel:+919636043246" className={styles.detailItem}>
                <Phone size={20} />
                <span>+91-9636043246</span>
              </a>

              <a href="tel:+919636212273" className={styles.detailItem}>
                <Phone size={20} />
                <span>+91-9636212273</span>
              </a>

              <a href="mailto:nuvosid@gmail.com" className={styles.detailItem}>
                <Mail size={20} />
                <span>nuvosid@gmail.com</span>
              </a>

              <div className={styles.detailItem}>
                <MapPin size={20} />
                <span>421-425 S.M. Lodha Complex, Udaipur-313001 (Raj.)</span>
              </div>
            </div>

            <div className={styles.socialRow}>
              {socialIconsList.map((social) => (
                <a 
                  key={social.name}
                  href={social.href}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={social.name === "facebook" || social.name === "twitter" || social.name === "linkedin" ? `${styles.socialIcon} fill-current-svg` : styles.socialIcon}
                >
                  {social.svg}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Form Panel */}
        <div className="col-12 col-lg-7">
          <div className={styles.formPanel}>
            <AnimatePresence mode="wait">
              {!showSuccess ? (
                <motion.form 
                  key="contact-form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSubmit}
                >
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <div className={styles.inputGroup}>
                        <label htmlFor="firstName">First Name</label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          required
                          value={formData.firstName}
                          onChange={handleInputChange}
                          placeholder="e.g. John"
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className={styles.inputGroup}>
                        <label htmlFor="lastName">Last Name</label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          required
                          value={formData.lastName}
                          onChange={handleInputChange}
                          placeholder="e.g. Doe"
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className={styles.inputGroup}>
                        <label htmlFor="email">E-mail</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="e.g. john@domain.com"
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className={styles.inputGroup}>
                        <label htmlFor="phone">Phone Number</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          inputMode="numeric"
                          maxLength={10}
                          required
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="10-digit mobile number"
                        />
                      </div>
                    </div>

                    <div className="col-12">
                      <div className={styles.inputGroup}>
                        <label htmlFor="message">Message</label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={5}
                          value={formData.message}
                          onChange={handleInputChange}
                          placeholder="Write your message.."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className={styles.submitBtn}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Sending message...</span>
                        </>
                      ) : (
                        <>
                          <span>Send a Message</span>
                          <Send size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="success-card"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={styles.successCard}
                >
                  <div className={styles.successCircle}>
                    <Check size={32} />
                  </div>
                  <h3>Message Sent!</h3>
                  <p>
                    Thank you for reaching out to Surpass & Nuvosid Academy. Our counselor team has received your message and will contact you shortly.
                  </p>
                  <button 
                    onClick={() => setShowSuccess(false)}
                    className={`${styles.submitBtn} mt-4`}
                  >
                    Send Another Message
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
