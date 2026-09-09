"use client";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, IndianRupee, Users, BookOpen } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { apiFetch } from "@/lib/api";

const inr = (paise) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format((Number(paise) || 0) / 100);

function fmtDateTime(d) {
  if (!d) return { date: "—", time: "" };
  try {
    const dt = new Date(d);
    return {
      date: dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch { return { date: "—", time: "" }; }
}

function Tile({ icon: Icon, color, value, label }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${color}`}><Icon size={20} /></span>
      <div>
        <div className="text-2xl font-extrabold text-gray-900 leading-tight">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    apiFetch("/api/enrollments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.enrollments || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const revenue = items.reduce((n, t) => n + (Number(t.amount) || 0), 0);
    const students = new Set(items.map((t) => t.studentId || t.studentEmail).filter(Boolean)).size;
    const courses = new Set(items.map((t) => t.courseTitle).filter(Boolean)).size;
    return { revenue, count: items.length, students, courses };
  }, [items]);

  const filtered = items.filter((t) =>
    [t.paymentId, t.studentName, t.studentEmail, t.courseTitle].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const shown = filtered.slice(0, pageSize);

  return (
    <AdminShell title="All Transactions" subtitle="Payments received from course enrollments.">
      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <Tile icon={IndianRupee} color="bg-emerald-500" value={inr(stats.revenue)} label="Total Revenue" />
        <Tile icon={CreditCard} color="bg-[#db254f]" value={stats.count} label="Transactions" />
        <Tile icon={Users} color="bg-sky-500" value={stats.students} label="Paying Students" />
        <Tile icon={BookOpen} color="bg-amber-500" value={stats.courses} label="Courses Sold" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Transactions List</h3>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <label className="text-sm text-gray-500 flex items-center gap-2">
            Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-gray-300 rounded-xl px-2 py-1.5 text-sm outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </label>
          <label className="text-sm text-gray-500 flex items-center gap-2">
            Search:
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Txn ID, student, course…" className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-[#db254f]" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>
                {["Sr. No.", "Transaction ID", "Student", "Course", "Amount", "Method", "Status", "Date"].map((h, i, a) => (
                  <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400">No transactions yet.</td></tr>
              ) : (
                shown.map((t, i) => {
                  const { date, time } = fmtDateTime(t.createdAt);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-600">{t.paymentId || t.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{t.studentName || "—"}</div>
                        {t.studentEmail && <div className="text-xs text-gray-400">{t.studentEmail}</div>}
                      </td>
                      <td className="py-3 px-4 text-gray-600 whitespace-normal max-w-[14rem]">{t.courseTitle || "—"}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{inr(t.amount)}</td>
                      <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded-md font-medium bg-indigo-50 text-indigo-600">Razorpay</span></td>
                      <td className="py-3 px-4"><span className="text-xs px-2.5 py-1 rounded-md font-medium bg-emerald-100 text-emerald-700">Paid</span></td>
                      <td className="py-3 px-4 text-gray-500"><div>{date}</div><div className="text-xs text-gray-400">{time}</div></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-gray-500 mt-4">Showing {shown.length === 0 ? 0 : 1} to {shown.length} of {filtered.length} entries</p>
      </div>
    </AdminShell>
  );
}
