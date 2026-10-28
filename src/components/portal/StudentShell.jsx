"use client";
import { LayoutDashboard, BookOpen, ClipboardCheck, FileText, User, MessagesSquare } from "lucide-react";
import RequireRole from "./RequireRole";
import PortalShell from "./PortalShell";

const NAV = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/my-courses", label: "My Courses", icon: BookOpen },
  { href: "/student/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/student/resume", label: "Build Your Resume", icon: FileText },
  { href: "/student/community", label: "Community", icon: MessagesSquare },
  { href: "/student/profile", label: "Profile", icon: User },
];

export default function StudentShell({ subtitle, children }) {
  return (
    <RequireRole role="student" loginPath="/student/login">
      <PortalShell brand="Student Portal" subtitle={subtitle} nav={NAV} loginPath="/student/login" scopeClass="pf-student">
        {children}
      </PortalShell>
    </RequireRole>
  );
}
