"use client";
import { useEffect, useMemo, useState } from "react";
import { Users, BookOpen, IndianRupee, CreditCard, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { useSession } from "@/context/SessionContext";
import { apiFetch } from "@/lib/api";

const inr = (paise) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format((Number(paise) || 0) / 100);

/* ---- inline area chart (no external lib) ---- */
function AreaChart({ series }) {
  const W = 700, H = 240, top = 20, base = 210;
  const n = series[0].data.length;
  const x = (i) => (i * W) / (n - 1);
  const y = (v) => base - (v / 100) * (base - top);
  const line = (data) => data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const area = (data) => `${line(data)} L${W},${base} L0,${base} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#db254f" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#db254f" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (
        <line key={g} x1="0" x2={W} y1={y(g)} y2={y(g)} stroke="#eef0f4" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      <path d={area(series[0].data)} fill="url(#areaFill)" />
      <path d={line(series[0].data)} fill="none" stroke="#db254f" strokeWidth="2.5" />
      <path d={line(series[1].data)} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
    </svg>
  );
}

function BarChart({ days, sales, revenue }) {
  const max = 100;
  return (
    <div className="flex items-end justify-between gap-2 h-48">
      {days.map((d, i) => (
        <div key={d} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex flex-col justify-end items-center h-40">
            <div className="w-3.5 rounded-t bg-sky-400" style={{ height: `${(revenue[i] / max) * 100}%` }} />
            <div className="w-3.5 rounded-b bg-[#db254f]" style={{ height: `${(sales[i] / max) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-400">{d}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- premium stat tile ---- */
function StatTile({ icon: Icon, gradient, value, label, delta, up, loading }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-10 blur-2xl transition group-hover:opacity-20" style={{ background: gradient }} aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: gradient }}>
            <Icon size={20} />
          </div>
          {delta && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${up ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"}`}>
              {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {delta}
            </span>
          )}
        </div>
        <div className="text-2xl font-extrabold text-gray-900 leading-none">{loading ? "…" : value}</div>
        <div className="text-sm text-gray-500 mt-1.5">{label}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useSession();
  const [counts, setCounts] = useState({ students: null, courses: null, revenue: 0, txns: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/manage-students", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      apiFetch("/api/courses", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      apiFetch("/api/enrollments", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]).then(([s, c, e]) => {
      const enr = e.enrollments || [];
      setCounts({
        students: (s.students || []).length,
        courses: (c.courses || []).length,
        revenue: enr.reduce((n, t) => n + (Number(t.amount) || 0), 0),
        txns: enr.length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const tiles = [
    { icon: Users, gradient: "linear-gradient(135deg,#0ea5e9,#38bdf8)", value: counts.students ?? 0, label: "Total Students", delta: "Live", up: true },
    { icon: BookOpen, gradient: "linear-gradient(135deg,#db254f,#e56b85)", value: counts.courses ?? 0, label: "Total Courses", delta: "Live", up: true },
    { icon: IndianRupee, gradient: "linear-gradient(135deg,#059669,#34d399)", value: inr(counts.revenue), label: "Total Revenue", delta: "Live", up: true },
    { icon: CreditCard, gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)", value: counts.txns, label: "Transactions", delta: "Live", up: true },
  ];

  const payments = [
    { name: "Sales", data: [15, 20, 28, 30, 25, 55, 50, 62, 58, 70, 66, 72] },
    { name: "Revenue", data: [10, 14, 22, 26, 24, 40, 65, 60, 78, 72, 68, 62] },
  ];

  return (
    <AdminShell title="Dashboard" subtitle="Nuvosid Admin Dashboard">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white mb-5">
        <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(219,37,79,0.10), transparent 55%)" }} aria-hidden="true" />
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full opacity-20 blur-3xl" style={{ background: "#e56b85" }} aria-hidden="true" />
        <div className="relative p-6 md:p-7 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#db254f] font-semibold mb-1.5">Welcome back</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">{user?.name || "Admin"} 👋</h2>
            <p className="text-sm text-gray-500 mt-1.5">Here&apos;s what&apos;s happening across your academy today.</p>
          </div>
          <div className="hidden md:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#db254f] to-[#e56b85] items-center justify-center text-white shadow-md shadow-rose-200">
            <TrendingUp size={26} />
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {tiles.map((t) => <StatTile key={t.label} {...t} loading={loading} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Payments Overview</h2>
            <span className="text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1.5">Monthly</span>
          </div>
          <AreaChart series={payments} />
          <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m) => <span key={m}>{m}</span>)}
          </div>
          <div className="grid grid-cols-2 mt-5 pt-5 border-t border-gray-100 text-center">
            <div>
              <div className="text-sm text-gray-500">Total Revenue</div>
              <div className="text-xl font-extrabold text-gray-900">{loading ? "…" : inr(counts.revenue)}</div>
            </div>
            <div className="border-l border-gray-100">
              <div className="text-sm text-gray-500">Transactions</div>
              <div className="text-xl font-extrabold text-gray-900">{loading ? "…" : counts.txns}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Profit this week</h2>
            <span className="text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1.5">This Week</span>
          </div>
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#db254f]" /> Sales</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Revenue</span>
          </div>
          <BarChart
            days={["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]}
            sales={[44, 55, 41, 67, 22, 43, 65]}
            revenue={[13, 23, 20, 8, 13, 27, 15]}
          />
        </div>
      </div>
    </AdminShell>
  );
}
