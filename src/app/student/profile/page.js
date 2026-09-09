"use client";
import { Mail, Shield, User as UserIcon } from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { useSession } from "@/context/SessionContext";

export default function StudentProfilePage() {
  const { user } = useSession();

  const rows = [
    { icon: UserIcon, label: "Name", value: user?.name || "—" },
    { icon: Shield, label: "Role", value: user?.role || "—" },
    { icon: Mail, label: "Account ID", value: user?.id || "—" },
  ];

  return (
    <StudentShell subtitle="Profile">
      <h2 className="text-2xl font-bold mb-6">My Profile</h2>

      <div className="max-w-xl pf-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] flex items-center justify-center text-2xl font-bold text-white shadow-sm shadow-rose-500/30">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <div className="text-lg font-bold">{user?.name || "Student"}</div>
            <div className="text-sm pf-muted capitalize">{user?.role}</div>
          </div>
        </div>

        <div className="pf-divide">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-3">
              <Icon size={16} className="text-[#db254f]" />
              <span className="text-sm pf-faint w-28">{label}</span>
              <span className="text-sm font-medium capitalize break-all">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </StudentShell>
  );
}
