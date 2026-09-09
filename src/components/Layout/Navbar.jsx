"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, LogOut, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { apiFetch, clearToken, onAuthChange } from "@/lib/api";
import styles from "./Navbar.module.scss";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Courses", href: "/courses" },
  { name: "Workshops", href: "/workshops" },
  { name: "Placement", href: "/placement" },
  { name: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const router   = useRouter();
  const pathname = usePathname();
  const { openModal } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch authentication status and user details on load,
  // and re-check whenever auth state changes (login/logout elsewhere).
  useEffect(() => {
    async function checkUser() {
      try {
        const res = await apiFetch("/api/auth/check");
        if (res.ok) {
          const data = await res.json();
          // Website only recognises STUDENT sessions — an admin token must not
          // make the public site appear logged in.
          if (data.authenticated && data.user?.role === "student") {
            setIsAuthenticated(true);
            setUser(data.user);
            return;
          }
        }
        setIsAuthenticated(false);
        setUser(null);
      } catch (err) {
        console.error("Auth check failed in Navbar:", err);
      }
    }
    checkUser();
    return onAuthChange(checkUser);
  }, []);

  // Logout handler — clear the local token and reset state.
  const handleLogout = async () => {
    clearToken();
    setIsAuthenticated(false);
    setUser(null);
    router.push("/");
  };

  return (
    <header
      className={`${styles.navbar} ${isScrolled ? styles.scrolled : styles.notScrolled}`}
    >
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <Image
            src={theme === "light" ? "/assets/logo_black.png" : "/assets/logo.png"}
            alt="Nuvosid Logo"
            width={160}
            height={40}
            unoptimized
          />
        </Link>

        {/* Desktop Menu */}
        <nav className={styles.navLinks}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`${styles.navLink} ${isActive ? styles.active : ""}`}
              >
                {link.name}
              </Link>
            );
          })}
          
          <button
            onClick={toggleTheme}
            className={styles.themeToggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated && user ? (
            <div className={styles.profileMenuContainer}>
              <div className={styles.profileCircle}>
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className={styles.profileDropdown}>
                <div className={styles.dropdownHeader}>
                  <span className={styles.greet}>Hello,</span>
                  <span className={styles.name}>{user.name || 'Student'}</span>
                </div>
                <div className={styles.dropdownDivider} />
                <button 
                  onClick={handleLogout} 
                  className={`${styles.dropdownItem} ${styles.logoutBtn}`}
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openModal("login")}
              className={styles.enrollBtn}
            >
              Login / Signup
            </button>
          )}
          <button
            onClick={() => (isAuthenticated ? router.push("/student/dashboard") : openModal("login"))}
            className={styles.enrollBtn}
          >
            Student Portal
          </button>
        </nav>

        {/* Mobile right-side controls */}
        <div className={styles.mobileControls}>
          <button
            onClick={toggleTheme}
            className={styles.themeToggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className={styles.mobileToggle}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className={styles.mobileOverlay}
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`${styles.mobileNavLink} ${isActive ? styles.active : ""}`}
              >
                {link.name}
              </Link>
            );
          })}

          {isAuthenticated && user ? (
            <div className={styles.mobileAuthBlock}>
              <div className={styles.mobileProfileRow}>
                <div className={styles.mobileProfileAvatar}>
                  {user.name ? user.name.charAt(0) : "U"}
                </div>
                <div className={styles.mobileProfileMeta}>
                  <span className={styles.greet}>Hello,</span>
                  <span className={styles.name}>{user.name || "Student"}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className={styles.mobileLogoutBtn}
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setIsOpen(false); openModal("login"); }}
              className={styles.mobileEnrollBtn}
            >
              Login / Signup
            </button>
          )}
        </motion.div>
      )}
    </header>
  );
}

