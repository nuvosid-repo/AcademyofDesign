"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Radio, ExternalLink } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { DatePicker, TimePicker } from "@/components/portal/DateTimePicker";
import { apiFetch } from "@/lib/api";

const EMPTY = { title: "", date: "", time: "", type: "Live Class", description: "", link: "", course: "" };

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
}

export default function LiveClassesPage() {
  const confirmDialog = useConfirm();

  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const load = () =>
    apiFetch("/api/live-classes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.liveClasses || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    apiFetch("/api/courses", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCourses((d.courses || []).map((c) => c.title)))
      .catch(() => setCourses([]));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => { setForm(EMPTY); setEditingId(null); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    try {
      const res = editingId
        ? await apiFetch(`/api/live-classes/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        : await apiFetch("/api/live-classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      reset();
      load();
    } finally {
      setSaving(false);
    }
  };

  const editItem = (l) => {
    setEditingId(l.id);
    setForm({ title: l.title, date: l.date, time: l.time, type: l.type || "Live Class", description: l.description, link: l.link, course: l.course });
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteItem = async (id) => {
    const ok = await confirmDialog({ title: "Delete entry?", text: "This live class will be permanently removed." });
    if (!ok) return;
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (editingId === id) reset();
    await apiFetch(`/api/live-classes/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const filtered = items.filter((l) =>
    [l.title, l.type, l.course].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const shown = filtered.slice(0, pageSize);

  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white transition";
  const label = "block text-sm text-gray-600 mb-1.5";

  return (
    <AdminShell title="Live Class" subtitle="Schedule and manage live classes.">
      {/* ---- Add / Edit ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center"><Radio size={18} /></span>
          <h2 className="font-bold text-gray-900">{editingId ? "Edit Live Class" : "Add Live Class"}</h2>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
            <div>
              <label className={label}>Title</label>
              <input className={field} value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <label className={label}>Date</label>
              <DatePicker value={form.date} onChange={(v) => set("date", v)} />
            </div>
            <div>
              <label className={label}>Time</label>
              <TimePicker value={form.time} onChange={(v) => set("time", v)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
            <div>
              <label className={label}>Description</label>
              <textarea rows={4} className={`${field} resize-y`} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div>
              <label className={label}>Live Class Link</label>
              <input className={field} placeholder="https://…" value={form.link} onChange={(e) => set("link", e.target.value)} />
            </div>
            <div>
              <label className={label}>Course</label>
              <select className={field} value={form.course} onChange={(e) => set("course", e.target.value)}>
                <option value="">--Select course--</option>
                {courses.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-7 py-2.5 shadow-sm shadow-rose-200 disabled:opacity-60 transition">
              {saving ? "Saving…" : editingId ? "Update" : "Submit"}
            </button>
            {editingId && <button type="button" onClick={reset} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>}
          </div>
        </div>
      </form>

      {/* ---- Table ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Live Classes List</h3>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-[#db254f]" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>
                {["Sr. No.", "Title", "Date", "Time", "Course", "Link", "Actions"].map((h, i, a) => (
                  <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No live classes found.</td></tr>
              ) : (
                shown.map((l, i) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900 whitespace-normal max-w-[16rem]">{l.title}</td>
                    <td className="py-3 px-4 text-gray-500">{fmtDate(l.date)}</td>
                    <td className="py-3 px-4 text-gray-500">{l.time || "—"}</td>
                    <td className="py-3 px-4 text-gray-500">{l.course || "—"}</td>
                    <td className="py-3 px-4">
                      {l.link ? <a href={l.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#db254f] hover:underline"><ExternalLink size={13} /> Join</a> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => editItem(l)} title="Edit" className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center"><Pencil size={14} /></button>
                        <button onClick={() => deleteItem(l.id)} title="Delete" className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-gray-500 mt-4">Showing {shown.length === 0 ? 0 : 1} to {shown.length} of {filtered.length} entries</p>
      </div>
    </AdminShell>
  );
}
