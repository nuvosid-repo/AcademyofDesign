"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cldUrl } from "@/lib/cldImage";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronDown, Sun, Moon, Menu, X, User2, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";

// Sidebar + topbar chrome shared by the student portal. Theme-aware (dark/light)
// via the site's data-theme tokens. `nav` items are either:
//   { href, label, icon }                        → a plain link
//   { label, icon, children: [{ href, label }] } → a collapsible group
export default function PortalShell({ brand, subtitle, nav, loginPath, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatar, setAvatar] = useState("");
  const menuRef = useRef(null);

  // Load the student's profile image for the avatar; update live when they
  // save a new photo (the profile page dispatches a "profile-image" event).
  useEffect(() => {
    let alive = true;
    apiFetch("/api/student/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.profile) setAvatar(d.profile.image || ""); })
      .catch(() => {});
    const onImg = (e) => setAvatar(e.detail || "");
    window.addEventListener("profile-image", onImg);
    return () => { alive = false; window.removeEventListener("profile-image", onImg); };
  }, [user?.id]);

  // Close the user menu on outside click.
  useEffect(() => {
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const isActive = (href) => !!href && (pathname === href || pathname.startsWith(href + "/"));
  const groupActive = (item) => item.children?.some((c) => isActive(c.href));

  const [open, setOpen] = useState(() => {
    const init = {};
    nav.forEach((item, i) => { if (item.children && groupActive(item)) init[i] = true; });
    return init;
  });

  const handleLogout = () => { logout(); router.replace(loginPath); };

  const rowBase = "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left";

  const SidebarInner = () => (
    <>
      <div className="px-6 py-6 border-b pf-border flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Image src={theme === "light" ? "/assets/logo_black.png" : "/assets/logo.png"} alt="Nuvosid" width={150} height={38} unoptimized className="h-9 w-auto object-contain" priority />
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#db254f] mt-2 font-semibold">{brand}</p>
        </Link>
        <button className="md:hidden pf-muted" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={20} /></button>
      </div>

      {/* Back to the public website */}
      <div className="px-3 pt-3">
        <Link href="/" onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium pf-nav pf-hover transition">
          <ArrowLeft size={16} className="text-[#db254f]" /> Back to Website
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item, i) => {
          const Icon = item.icon;
          if (item.children) {
            const opened = !!open[i];
            const active = groupActive(item);
            return (
              <div key={item.label}>
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))} className={`${rowBase} ${active ? "pf-nav-active" : "pf-nav"}`} aria-expanded={opened}>
                  {Icon && <Icon size={17} />}
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown size={15} className={`transition-transform ${opened ? "rotate-180" : ""}`} />
                </button>
                {opened && (
                  <div className="mt-1 ml-4 pl-3 border-l pf-border space-y-1">
                    {item.children.map((c) => (
                      <Link key={c.href} href={c.href} onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg text-sm ${isActive(c.href) ? "pf-nav-active" : "pf-nav"}`}>{c.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`${rowBase} ${isActive(item.href) ? "pf-nav-active" : "pf-nav"}`}>
              {Icon && <Icon size={17} />}
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button onClick={handleLogout} className={`${rowBase} pf-nav m-3`} style={{ width: "auto" }}>
        <LogOut size={17} /> Log Out
      </button>
    </>
  );

  return (
    <div className="min-h-screen flex pf-page relative">
      {/* Decorative brand glows */}
      <span className="pf-glow" style={{ width: 360, height: 360, top: -120, left: 160, background: "rgba(219,37,79,0.18)" }} aria-hidden="true" />
      <span className="pf-glow" style={{ width: 300, height: 300, bottom: -80, right: -40, background: "rgba(229,107,133,0.14)" }} aria-hidden="true" />

      {/* Sidebar (desktop) — fixed while the main content scrolls */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r pf-border pf-panel sticky top-0 h-screen self-start z-10">
        <SidebarInner />
      </aside>

      {/* Sidebar (mobile drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 flex flex-col border-r pf-border pf-panel">
            <SidebarInner />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 md:px-8 h-16 border-b pf-border pf-panel">
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden w-10 h-10 rounded-xl pf-card flex items-center justify-center pf-muted hover:text-[#db254f] transition" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <span className="hidden sm:block w-1.5 h-9 rounded-full bg-gradient-to-b from-[#db254f] to-[#e56b85] shrink-0" />
            <h1 className="text-lg md:text-xl font-bold truncate" style={{ margin: 0, lineHeight: 1.1 }}>{subtitle}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full pf-card flex items-center justify-center pf-muted hover:text-[#db254f] transition"
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <span className="hidden sm:block w-px h-8 pf-border border-l mx-0.5" />

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className={`flex items-center gap-2.5 rounded-full pl-1 pr-1.5 sm:pr-2.5 py-1 border transition ${menuOpen ? "pf-nav-active" : "pf-card"}`}
              >
                {avatar ? (
                  <img src={cldUrl(avatar, { width: 80 })} alt={user?.name || "Profile"} loading="lazy" decoding="async" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] flex items-center justify-center text-sm font-bold text-white shadow-sm shadow-rose-500/30 shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </span>
                )}
                <span className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold truncate max-w-[9rem]">{user?.name || "User"}</span>
                  <span className="text-[11px] pf-faint capitalize">{user?.role}</span>
                </span>
                <ChevronDown size={15} className={`hidden sm:block pf-faint transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 pf-card overflow-hidden z-40 p-0">
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b pf-border" style={{ background: "linear-gradient(90deg, rgba(219,37,79,0.10), transparent)" }}>
                    {avatar ? (
                      <img src={cldUrl(avatar, { width: 80 })} alt={user?.name || "Profile"} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] flex items-center justify-center font-bold text-white shrink-0">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{user?.name || "User"}</p>
                      <p className="text-xs pf-faint capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <Link href="/student/profile" onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium pf-hover transition">
                    <User2 size={15} className="text-[#db254f]" /> My Profile
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-[#db254f] pf-hover transition border-t pf-border">
                    <LogOut size={15} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
