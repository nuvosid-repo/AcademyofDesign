"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, Search, Eye, X, Ticket, IndianRupee, CheckCircle2, Clock,
  Mail, Phone, MapPin, Briefcase, Hash, Calendar, CreditCard,
} from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { apiFetch } from "@/lib/api";

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}
const rupees = (paise) => "₹" + (Math.round((paise || 0)) / 100).toLocaleString("en-IN");

function StatusBadge({ status }) {
  const map = {
    Paid: ["bg-emerald-100 text-emerald-700", CheckCircle2],
    Pending: ["bg-amber-100 text-amber-700", Clock],
    Failed: ["bg-rose-100 text-rose-700", X],
  };
  const [cls, Ic] = map[status] || map.Pending;
  return <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-semibold ${cls}`}><Ic size={12} /> {status}</span>;
}

function Tile({ icon: Icon, label, value, tint }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tint.bg, color: tint.fg }}><Icon size={18} /></span>
      <div><div className="text-xs text-gray-400">{label}</div><div className="text-lg font-bold text-gray-900">{value}</div></div>
    </div>
  );
}

export default function WorkshopRegistrationsPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [sel, setSel] = useState(null);

  useEffect(() => {
    apiFetch("/api/workshops/registrations", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setRows(d.registrations || []); setSummary(d.summary || {}); })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const workshops = useMemo(() => [...new Set(rows.map((r) => r.workshopTitle).filter(Boolean))], [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!status || r.paymentStatus === status) &&
      (!workshop || r.workshopTitle === workshop) &&
      (!needle || [r.name, r.email, r.phone, r.transactionId].some((v) => (v || "").toLowerCase().includes(needle)))
    );
  }, [rows, q, status, workshop]);

  const selStyle = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#db254f]";

  return (
    <AdminShell title="Workshop Registrations" subtitle="Everyone who registered for an event — with their billing & payment details.">
      <Link href="/admin/workshops" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#db254f] text-sm mb-4"><ArrowLeft size={15} /> Back to Workshops</Link>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Tile icon={Ticket} label="Total Registrations" value={summary.total ?? 0} tint={{ bg: "rgba(219,37,79,0.1)", fg: "#db254f" }} />
        <Tile icon={CheckCircle2} label="Paid" value={summary.paid ?? 0} tint={{ bg: "rgba(16,185,129,0.12)", fg: "#059669" }} />
        <Tile icon={Clock} label="Pending" value={summary.pending ?? 0} tint={{ bg: "rgba(245,158,11,0.12)", fg: "#d97706" }} />
        <Tile icon={IndianRupee} label="Revenue (Paid)" value={rupees(summary.revenue)} tint={{ bg: "rgba(67,56,202,0.1)", fg: "#4338ca" }} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users size={17} className="text-[#db254f]" /> Registrations</h3>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / email / phone / txn…" className={`${selStyle} pl-9 w-64`} />
            </div>
            <select value={workshop} onChange={(e) => setWorkshop(e.target.value)} className={selStyle}><option value="">All workshops</option>{workshops.map((w) => <option key={w} value={w}>{w}</option>)}</select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selStyle}><option value="">All status</option><option value="Paid">Paid</option><option value="Pending">Pending</option><option value="Failed">Failed</option></select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>
                {["Sr. No.", "Attendee", "Phone", "Workshop", "Designation", "Amount", "Status", "Registered", "Action"].map((h, i, a) => (
                  <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400">{rows.length === 0 ? "No workshop registrations yet." : "No registrations match your filters."}</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-500">{i + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] text-white text-xs font-bold flex items-center justify-center shrink-0">{r.name?.charAt(0)?.toUpperCase() || "A"}</span>
                      <div className="min-w-0"><div className="font-medium text-gray-900">{r.name}</div><div className="text-xs text-gray-400">{r.email}</div></div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{r.phone || "—"}</td>
                  <td className="py-3 px-4 text-gray-700 max-w-[220px] truncate" title={r.workshopTitle}>{r.workshopTitle}</td>
                  <td className="py-3 px-4 text-gray-500">{r.designation || "—"}</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">{r.price || rupees(r.amount)}</td>
                  <td className="py-3 px-4"><StatusBadge status={r.paymentStatus} /></td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{fmtDate(r.createdAt)}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => setSel(r)} className="inline-flex items-center gap-1.5 btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-xs font-semibold px-3.5 py-2 transition"><Eye size={14} /> View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── View modal ── */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={() => setSel(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] text-white font-bold flex items-center justify-center shrink-0">{sel.name?.charAt(0)?.toUpperCase() || "A"}</span>
                <div className="min-w-0"><div className="font-bold text-gray-900 truncate">{sel.name}</div><div className="text-xs text-gray-400">Registered {fmtDate(sel.createdAt)}</div></div>
              </div>
              <button onClick={() => setSel(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shrink-0"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Payment summary */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400">Amount</div>
                  <div className="text-2xl font-extrabold text-gray-900">{sel.price || rupees(sel.amount)}</div>
                </div>
                <StatusBadge status={sel.paymentStatus} />
              </div>

              {/* Attendee */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Attendee</div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <Row icon={Mail} label="Email" value={sel.email} />
                  <Row icon={Phone} label="Phone" value={sel.phone} />
                  <Row icon={Briefcase} label="Designation" value={sel.designation} />
                  <Row icon={MapPin} label="Country" value={sel.country} />
                  <Row icon={Hash} label="Interest" value={sel.interest} />
                </div>
              </div>

              {/* Workshop + billing */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Workshop & Billing</div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <Row icon={Ticket} label="Workshop" value={sel.workshopTitle} />
                  <Row icon={CreditCard} label="Transaction ID" value={sel.transactionId || "—"} mono />
                  <Row icon={Calendar} label="Paid At" value={sel.paidAt ? fmtDate(sel.paidAt) : "—"} />
                  {sel.paymentId && <Row icon={CreditCard} label="Payment ID" value={sel.paymentId} mono />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function Row({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-[#db254f] mt-0.5 shrink-0" />
      <div className="min-w-0"><div className="text-[11px] text-gray-400">{label}</div><div className={`text-gray-800 break-words ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</div></div>
    </div>
  );
}
