"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, setToken } from "@/lib/api";
import styles from "./AuthModal.module.scss";

export default function AuthModal() {
  const { isOpen, mode, setMode, closeModal } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({ name: "", email: "", contactNumber: "", institutionName: "", password: "" });
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);

  const isLogin = mode === "login";

  /* reset form when modal opens or mode switches */
  useEffect(() => {
    setFormData({ name: "", email: "", contactNumber: "", institutionName: "", password: "" });
    setError("");
    setSuccess("");
    setLoading(false);
    setShowPwd(false);
  }, [isOpen, mode]);

  /* close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeModal]);

  /* prevent body scroll when open */
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res  = await apiFetch(isLogin ? "/api/login" : "/api/signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        // Website login is students-only — admin accounts are rejected here.
        body:    JSON.stringify(isLogin ? { ...formData, requiredRole: "student" } : formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (isLogin) {
        // Persist the JWT so subsequent requests (and other components) see it.
        if (data.token) setToken(data.token);
        setSuccess("Welcome back! Redirecting…");
        // Website login is for students → always go to the student dashboard.
        // (Admins sign in through the separate /admin/login page.)
        setTimeout(() => {
          closeModal();
          router.push("/student/dashboard");
        }, 900);
      } else {
        setSuccess("Account created! Please sign in.");
        setTimeout(() => { setMode("login"); }, 1400);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = useCallback(() => {
    setMode(m => m === "login" ? "signup" : "login");
  }, [setMode]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={closeModal}
          aria-modal="true"
          role="dialog"
          aria-label={isLogin ? "Sign in" : "Create account"}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, y: 48, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 28, scale: 0.97  }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button className={styles.closeBtn} onClick={closeModal} aria-label="Close">
              <X size={18} />
            </button>

            {/* Mode toggle pill */}
            <div className={styles.toggle}>
              <button
                className={isLogin ? styles.toggleActive : ""}
                onClick={() => setMode("login")}
              >
                Sign In
              </button>
              <button
                className={!isLogin ? styles.toggleActive : ""}
                onClick={() => setMode("signup")}
              >
                Register
              </button>
            </div>

            {/* Heading */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8  }}
                transition={{ duration: 0.22 }}
              >
                <h2 className={styles.title}>
                  {isLogin ? "Welcome Back" : "Create Account"}
                </h2>
                <p className={styles.subtitle}>
                  {isLogin
                    ? "Access your dashboard and enrolled courses."
                    : "Start your journey with professional design courses."}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Feedback */}
            <AnimatePresence>
              {(error || success) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{    opacity: 0, height: 0     }}
                  style={{ overflow: "hidden" }}
                >
                  {error   && <p className={styles.errorMsg}>{error}</p>}
                  {success && <p className={styles.successMsg}>{success}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              <AnimatePresence mode="popLayout">
                {!isLogin && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0,    marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: "1.2rem" }}
                    exit={{    opacity: 0, height: 0,    marginBottom: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <label className={styles.label} htmlFor="am-name">Full Name</label>
                    <input
                      className={styles.input}
                      id="am-name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      required={!isLogin}
                      autoComplete="name"
                    />
                  </motion.div>
                )}

                {!isLogin && (
                  <motion.div
                    key="mobile"
                    initial={{ opacity: 0, height: 0,    marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: "1.2rem" }}
                    exit={{    opacity: 0, height: 0,    marginBottom: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <label className={styles.label} htmlFor="am-mobile">Mobile Number</label>
                    <input
                      className={styles.input}
                      id="am-mobile"
                      name="contactNumber"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={formData.contactNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          contactNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
                        }))
                      }
                      placeholder="10-digit mobile number"
                      required={!isLogin}
                      autoComplete="tel"
                    />
                  </motion.div>
                )}

                {!isLogin && (
                  <motion.div
                    key="institute"
                    initial={{ opacity: 0, height: 0,    marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: "1.2rem" }}
                    exit={{    opacity: 0, height: 0,    marginBottom: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <label className={styles.label} htmlFor="am-institute">Institute Name <span style={{ opacity: 0.55, fontWeight: 400 }}>(optional)</span></label>
                    <input
                      className={styles.input}
                      id="am-institute"
                      name="institutionName"
                      type="text"
                      value={formData.institutionName}
                      onChange={handleChange}
                      placeholder="Your institute / organization (if any)"
                      autoComplete="organization"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="am-email">Email Address</label>
                <input
                  className={styles.input}
                  id="am-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="am-password">Password</label>
                <div className={styles.passwordWrap}>
                  <input
                    className={styles.input}
                    id="am-password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    minLength={6}
                    required
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPwd(p => !p)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
                whileHover={!loading ? { y: -2 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading
                  ? (isLogin ? "Signing in…" : "Creating account…")
                  : (isLogin ? <>Sign In <ArrowRight size={15} /></>
                             : <>Create Account <ArrowRight size={15} /></>)}
              </motion.button>
            </form>

            {/* Switch mode link */}
            <p className={styles.switchText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button className={styles.switchLink} onClick={switchMode}>
                {isLogin ? "Register" : "Sign In"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
