"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Presentation, Plus, User, CalendarClock, ListChecks } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { DatePicker, TimePicker } from "@/components/portal/DateTimePicker";
import { apiFetch } from "@/lib/api";

const STATUSES = ["Active", "Inactive"];

const EMPTY = {
  title: "", subtitle: "", category: "", date: "", startTime: "", endTime: "", time: "", location: "",
  price: "", originalPrice: "", image: "", videoUrl: "", videoCaption: "", status: "Active",
  speaker: { name: "", designation: "", credentials: "", image: "", bio: "" },
  schedule: [{ time: "", activity: "" }],
  keynotes: [""],
};

export default function WorkshopsPage() {
  const confirmDialog = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const load = () =>
    apiFetch("/api/workshops", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.workshops || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSpeaker = (k, v) => setForm((f) => ({ ...f, speaker: { ...f.speaker, [k]: v } }));

  // schedule
  const addSlot = () => setForm((f) => ({ ...f, schedule: [...f.schedule, { time: "", activity: "" }] }));
  const setSlot = (i, k, v) => setForm((f) => ({ ...f, schedule: f.schedule.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const rmSlot = (i) => setForm((f) => ({ ...f, schedule: f.schedule.filter((_, j) => j !== i) }));
  // keynotes
  const addNote = () => setForm((f) => ({ ...f, keynotes: [...f.keynotes, ""] }));
  const setNote = (i, v) => setForm((f) => ({ ...f, keynotes: f.keynotes.map((n, j) => (j === i ? v : n)) }));
  const rmNote = (i) => setForm((f) => ({ ...f, keynotes: f.keynotes.filter((_, j) => j !== i) }));

  const reset = () => { setForm(EMPTY); setEditingId(null); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    try {
      const res = editingId
        ? await apiFetch(`/api/workshops/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        : await apiFetch("/api/workshops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      reset();
      load();
    } finally {
      setSaving(false);
    }
  };

  const editItem = (w) => {
    setEditingId(w.id);
    setForm({
      title: w.title || "", subtitle: w.subtitle || "", category: w.category || "", date: w.date || "",
      startTime: w.startTime || "", endTime: w.endTime || "", time: w.time || "",
      location: w.location || "", price: w.price || "", originalPrice: w.originalPrice || "", image: w.image || "",
      videoUrl: w.videoUrl || "", videoCaption: w.videoCaption || "", status: w.status || "Active",
      speaker: { name: w.speaker?.name || "", designation: w.speaker?.designation || "", credentials: w.speaker?.credentials || "", image: w.speaker?.image || "", bio: w.speaker?.bio || "" },
      schedule: (w.schedule && w.schedule.length) ? w.schedule.map((s) => ({ time: s.time || "", activity: s.activity || "" })) : [{ time: "", activity: "" }],
      keynotes: (w.keynotes && w.keynotes.length) ? [...w.keynotes] : [""],
    });
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteItem = async (id) => {
    const ok = await confirmDialog({ title: "Delete workshop?", text: "This workshop will be permanently removed." });
    if (!ok) return;
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (editingId === id) reset();
    await apiFetch(`/api/workshops/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const filtered = items.filter((w) => [w.title, w.category, w.location].join(" ").toLowerCase().includes(search.toLowerCase()));
  const shown = filtered.slice(0, pageSize);

  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white transition";
  const label = "block text-sm text-gray-600 mb-1.5";
  const Req = () => <span className="text-rose-500"> *</span>;

  return (
    <AdminShell title="Workshops" subtitle="Create and manage workshops shown on the website.">
      {/* ---- Add / Edit ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center"><Presentation size={18} /></span>
          <h2 className="font-bold text-gray-900">{editingId ? "Edit Workshop" : "Add Workshop"}</h2>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          {/* Basic details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Title<Req /></label>
              <input className={field} value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <label className={label}>Subtitle</label>
              <input className={field} value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div><label className={label}>Category</label><input className={field} placeholder="e.g. Architecture & Structures" value={form.category} onChange={(e) => set("category", e.target.value)} /></div>
            <div><label className={label}>Date</label><DatePicker value={form.date} onChange={(v) => set("date", v)} placeholder="Select date" /></div>
            <div><label className={label}>Start Time</label><TimePicker value={form.startTime} onChange={(v) => set("startTime", v)} placeholder="Start time" /></div>
            <div><label className={label}>End Time</label><TimePicker value={form.endTime} onChange={(v) => set("endTime", v)} placeholder="End time" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div><label className={label}>Location</label><input className={field} placeholder="Studio / Online" value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
            <div><label className={label}>Status</label>
              <select className={field} value={form.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            </div>
            <div><label className={label}>Price</label><input className={field} placeholder="₹999.00" value={form.price} onChange={(e) => set("price", e.target.value)} /></div>
            <div><label className={label}>Original Price</label><input className={field} placeholder="₹2,999.00" value={form.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className={label}>Image URL</label><input className={field} placeholder="https://… or /assets/…" value={form.image} onChange={(e) => set("image", e.target.value)} /></div>
            <div><label className={label}>Intro Video URL</label><input className={field} placeholder="YouTube / Vimeo link" value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} /></div>
            <div><label className={label}>Video Caption</label><input className={field} value={form.videoCaption} onChange={(e) => set("videoCaption", e.target.value)} /></div>
          </div>

          {/* Speaker */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4"><User size={16} className="text-[#db254f]" /> Speaker</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div><label className={label}>Name</label><input className={field} value={form.speaker.name} onChange={(e) => setSpeaker("name", e.target.value)} /></div>
              <div><label className={label}>Designation</label><input className={field} value={form.speaker.designation} onChange={(e) => setSpeaker("designation", e.target.value)} /></div>
              <div><label className={label}>Credentials</label><input className={field} value={form.speaker.credentials} onChange={(e) => setSpeaker("credentials", e.target.value)} /></div>
              <div><label className={label}>Photo URL</label><input className={field} placeholder="https://…" value={form.speaker.image} onChange={(e) => setSpeaker("image", e.target.value)} /></div>
            </div>
            <div className="mt-4"><label className={label}>Bio</label><textarea rows={3} className={`${field} resize-y`} value={form.speaker.bio} onChange={(e) => setSpeaker("bio", e.target.value)} /></div>
          </div>

          {/* Schedule */}
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><CalendarClock size={16} className="text-[#db254f]" /> Schedule</h3>
              <button type="button" onClick={addSlot} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white px-4 py-2 transition"><Plus size={15} /> Add Slot</button>
            </div>
            <div className="space-y-3">
              {form.schedule.map((s, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-3">
                  <input className={`${field} sm:max-w-[12rem]`} placeholder="10:00 AM" value={s.time} onChange={(e) => setSlot(i, "time", e.target.value)} />
                  <input className={field} placeholder="Activity / session" value={s.activity} onChange={(e) => setSlot(i, "activity", e.target.value)} />
                  {form.schedule.length > 1 && <button type="button" onClick={() => rmSlot(i)} className="shrink-0 w-10 rounded-xl border border-gray-200 text-gray-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center"><Trash2 size={15} /></button>}
                </div>
              ))}
            </div>
          </div>

          {/* Keynotes */}
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><ListChecks size={16} className="text-[#db254f]" /> Key Takeaways</h3>
              <button type="button" onClick={addNote} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white px-4 py-2 transition"><Plus size={15} /> Add Point</button>
            </div>
            <div className="space-y-3">
              {form.keynotes.map((n, i) => (
                <div key={i} className="flex gap-3">
                  <input className={field} placeholder="A key takeaway…" value={n} onChange={(e) => setNote(i, e.target.value)} />
                  {form.keynotes.length > 1 && <button type="button" onClick={() => rmNote(i)} className="shrink-0 w-10 rounded-xl border border-gray-200 text-gray-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center"><Trash2 size={15} /></button>}
                </div>
              ))}
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
        <h3 className="font-bold text-gray-900 mb-4">Workshops List</h3>
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
                {["Sr. No.", "Image", "Title", "Category", "Date", "Price", "Status", "Actions"].map((h, i, a) => (
                  <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">No workshops found.</td></tr>
              ) : (
                shown.map((w, i) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                    <td className="py-3 px-4">
                      {w.image ? <img src={w.image} alt={w.title} className="w-12 h-9 rounded-md object-cover" /> : <span className="w-12 h-9 rounded-md bg-gray-100 flex items-center justify-center text-gray-400"><Presentation size={14} /></span>}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900 whitespace-normal max-w-[18rem]">{w.title}</td>
                    <td className="py-3 px-4 text-gray-500">{w.category || "—"}</td>
                    <td className="py-3 px-4 text-gray-500">{w.date || "—"}</td>
                    <td className="py-3 px-4 text-gray-500">{w.price || "—"}</td>
                    <td className="py-3 px-4"><span className={`text-xs px-2.5 py-1 rounded-md font-medium ${w.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{w.status}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => editItem(w)} title="Edit" className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center"><Pencil size={14} /></button>
                        <button onClick={() => deleteItem(w.id)} title="Delete" className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center"><Trash2 size={14} /></button>
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
