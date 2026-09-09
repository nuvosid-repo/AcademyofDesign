"use client";
import { Construction } from "lucide-react";
import AdminShell from "./AdminShell";

// Lightweight "coming soon" screen for admin sections not built yet.
export default function AdminPlaceholder({ title, note }) {
  return (
    <AdminShell title={title} subtitle={note || "Manage this section here."}>
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-[#db254f] flex items-center justify-center mb-4">
          <Construction size={26} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Coming soon</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
          The <span className="text-[#db254f] font-medium">{title}</span> section is set up and
          ready. Tell me what it should do and I&apos;ll build it out.
        </p>
      </div>
    </AdminShell>
  );
}
