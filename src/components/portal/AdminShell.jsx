"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  PieChart, Home, BookOpen, ClipboardList, ClipboardCheck, Users,
  CreditCard, ChevronDown, ChevronUp, Search, Bell, Presentation,
  LogOut, Menu, X, Sun, Moon, FileText,
} from "lucide-react";
import RequireRole from "./RequireRole";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/context/ThemeContext";

// Admin sidebar menu. Items with `children` render as collapsible groups.
const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: PieChart },
  {
    label: "Masters", icon: Home,
    children: [
      { href: "/admin/masters/role", label: "Role" },
      { href: "/admin/masters/user", label: "User" },
      { href: "/admin/masters/category", label: "Category" },
      { href: "/admin/masters/banner", label: "Banner" },
      { href: "/admin/masters/notification", label: "Notification" },
      { href: "/admin/masters/instructors", label: "Instructors" },
    ],
  },
  {
    label: "Course", icon: BookOpen,
    children: [{ href: "/admin/manage-courses", label: "All Courses" }],
  },
  { href: "/admin/live-classes", label: "Live Class", icon: ClipboardList },
  {
    label: "Workshop", icon: Presentation,
    children: [
      { href: "/admin/workshops", label: "All Workshops" },
      { href: "/admin/workshops/registrations", label: "Registrations & Billing" },
    ],
  },
  { href: "/admin/assessments", label: "Assessment", icon: ClipboardCheck },
  {
    label: "Student", icon: Users,
    children: [{ href: "/admin/manage-students", label: "All Students" }],
  },
  { href: "/admin/resumes", label: "Resume", icon: FileText },
  { href: "/admin/transactions", label: "All Transactions", icon: CreditCard },
];

function Sidebar({ onNavigate }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isActive = (href) => !!href && (pathname === href || pathname.startsWith(href + "/"));
  const groupActive = (item) => item.children?.some((c) => isActive(c.href));

  const [open, setOpen] = useState(() => {
    const init = {};
    NAV.forEach((item, i) => { if (item.children && groupActive(item)) init[i] = true; });
    return init;
  });

  return (
    <div className="flex h-full flex-col bg-white">
      <Link href="/" className="flex items-center px-6 h-[70px] border-b border-gray-100">
        <Image
          src={theme === "dark" ? "/assets/logo.png" : "/assets/logo_black.png"}
          alt="Nuvosid"
          width={150}
          height={38}
          unoptimized
          className="h-9 w-auto object-contain"
          priority
        />
      </Link>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Main Menu
        </p>

        <div className="space-y-1">
          {NAV.map((item, i) => {
            const Icon = item.icon;

            if (item.children) {
              const opened = !!open[i];
              const active = groupActive(item);
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      active ? "bg-rose-50 text-[#db254f]" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {opened ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {opened && (
                    <div className="mt-1 ml-4 pl-4 border-l border-gray-100 space-y-1">
                      {item.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          onClick={onNavigate}
                          className={`block px-3 py-2 rounded-lg text-sm transition ${
                            isActive(c.href)
                              ? "bg-rose-50 text-[#db254f] font-medium"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                          }`}
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive(item.href) ? "bg-rose-50 text-[#db254f]" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function AdminChrome({ title, subtitle, children }) {
  const router = useRouter();
  const { user, logout } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the user menu on outside click.
  useEffect(() => {
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.replace("/admin/login");
  };

  return (
    <div className="admin-shell min-h-screen bg-gray-50 text-gray-800 flex" style={{ "--fg-rgb": "31,41,55" }}>
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-gray-100">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* Sidebar (mobile drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_12px_-4px_rgba(0,0,0,0.08)] px-4 md:px-8 py-3.5">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Title with rose accent bar */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="hidden sm:block w-1.5 h-10 rounded-full bg-gradient-to-b from-[#db254f] to-[#e56b85] shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-extrabold text-gray-900 leading-tight truncate">{title}</h1>
                {subtitle && <p className="text-xs md:text-sm text-gray-500 truncate">{subtitle}</p>}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full btn-pill px-4 py-2.5 w-52 md:w-72 transition focus-within:border-[#db254f] focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-100">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  placeholder="Search…"
                  className="bg-transparent text-sm outline-none w-full placeholder:text-gray-400"
                />
              </div>

              <button onClick={toggleTheme} className="w-10 h-10 rounded-full btn-pill bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#db254f] hover:border-rose-200 transition" aria-label="Toggle theme" title={theme === "dark" ? "Switch to light" : "Switch to dark"}>
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button className="relative w-10 h-10 rounded-full btn-pill bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#db254f] hover:border-rose-200 transition" aria-label="Notifications">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full btn-pill ring-2 ring-white" />
              </button>

              <span className="hidden sm:block w-px h-8 bg-gray-200 mx-0.5" />

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className={`flex items-center gap-2 bg-white border rounded-full btn-pill pl-1 pr-2.5 py-1 transition ${menuOpen ? "border-[#db254f] ring-2 ring-rose-100" : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"}`}
                >
                  <span className="w-8 h-8 rounded-full btn-pill bg-gradient-to-br from-[#db254f] to-[#e56b85] flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-rose-200">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                  </span>
                  <span className="hidden sm:flex flex-col items-start leading-tight pr-0.5">
                    <span className="text-sm font-semibold text-gray-800 max-w-[9rem] truncate">{user?.name || "Admin"}</span>
                    <span className="text-[11px] text-gray-400 capitalize">{user?.role || "admin"}</span>
                  </span>
                  <ChevronDown size={15} className={`text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/70 overflow-hidden z-40">
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-rose-50/70 to-transparent border-b border-gray-100">
                      <span className="w-10 h-10 rounded-full btn-pill bg-gradient-to-br from-[#db254f] to-[#e56b85] flex items-center justify-center text-white font-bold shrink-0">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || "Admin"}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role || "admin"}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut size={15} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminShell({ title, subtitle, children }) {
  return (
    <RequireRole role="admin" loginPath="/admin/login" theme="light">
      <AdminChrome title={title || "Dashboard"} subtitle={subtitle}>
        {children}
      </AdminChrome>
    </RequireRole>
  );
}
