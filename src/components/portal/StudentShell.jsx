"use client";
import { LayoutDashboard, BookOpen, ClipboardCheck, FileText, User } from "lucide-react";
import RequireRole from "./RequireRole";
import PortalShell from "./PortalShell";
import StudyTimeTracker from "./StudyTimeTracker";

const NAV = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/my-courses", label: "My Courses", icon: BookOpen },
  { href: "/student/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/student/resume", label: "Build Your Resume", icon: FileText },
  { href: "/student/profile", label: "Profile", icon: User },
];

export default function StudentShell({ subtitle, children }) {
  return (
    <RequireRole role="student" loginPath="/student/login">
      <StudyTimeTracker />
      <PortalShell brand="Student Portal" subtitle={subtitle} nav={NAV} loginPath="/student/login">
        {children}
      </PortalShell>
    </RequireRole>
  );
}
