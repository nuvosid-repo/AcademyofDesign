"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Bell } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import SearchSelect from "@/components/portal/SearchSelect";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { apiFetch } from "@/lib/api";

function fmtDate(d) {
  try {
    const dt = new Date(d);
    const date = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const time = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
  } catch {
    return { date: "—", time: "" };
  }
}

export default function NotificationPage() {
  const confirmDialog = useConfirm();

  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [course, setCourse] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const load = () =>
    apiFetch("/api/notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.notifications || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    apiFetch("/api/courses", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCourses(d.courses || []))
      .catch(() => setCourses([]));
  }, []);

  const courseTitles = useMemo(() => courses.map((c) => c.title), [courses]);

  const reset = () => { setCourse(""); setMessage(""); setEditingId(null); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!course || !message.trim()) { setError("Please select a course and enter a message"); return; }
    setSaving(true);
    try {
      const courseId = courses.find((c) => c.title === course)?.id || "";
      const payload = { course, courseId, message: message.trim() };
      const res = editingId
        ? await apiFetch(`/api/notifications/${editingId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          })
        : await apiFetch("/api/notifications", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      reset();
      load();
    } finally {
      setSaving(false);
    }
  };

  const editItem = (n) => {
    setEditingId(n.id);
    setCourse(n.course);
    setMessage(n.message);
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteItem = async (id) => {
    const ok = await confirmDialog({ title: "Delete notification?", text: "This notification will be permanently removed." });
    if (!ok) return;
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (editingId === id) reset();
    await apiFetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const filtered = items.filter((n) =>
    [n.message, n.course].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const shown = filtered.slice(0, pageSize);

  return (
    <AdminShell title="Notification" subtitle="Send notifications to course students.">
      {/* ---- Add / Edit ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center">
            <Bell size={18} />
          </span>
          <h2 className="font-bold text-gray-900">{editingId ? "Edit Notification" : "Add Notification"}</h2>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          <div className="max-w-xl">
            <label className="block text-sm text-gray-600 mb-1.5">Course <span className="text-rose-500">*</span></label>
            <SearchSelect options={courseTitles} value={course} onChange={setCourse} />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Message <span className="text-rose-500">*</span></label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white transition resize-y"
            />
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-7 py-2.5 shadow-sm shadow-rose-200 disabled:opacity-60 transition">
              {saving ? "Saving…" : editingId ? "Update" : "Submit"}
            </button>
            {editingId && <button type="button" onClick={reset} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>}
          </div>
        </div>
      </form>

      {/* ---- Table ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <label className="text-sm text-gray-500 flex items-center gap-2">
            Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-300 rounded-xl px-2 py-1.5 text-sm outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </label>
          <label className="text-sm text-gray-500 flex items-center gap-2">
            Search:
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-[#db254f]" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>
                {["Sr. No.", "Message", "Course", "Created Date", "Actions"].map((h, i, a) => (
                  <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">No notifications found.</td></tr>
              ) : (
                shown.map((n, i) => {
                  const { date, time } = fmtDate(n.createdAt);
                  return (
                    <tr key={n.id} className="hover:bg-gray-50 align-top">
                      <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                      <td className="py-3 px-4 text-gray-700 whitespace-normal max-w-md">{n.message}</td>
                      <td className="py-3 px-4 text-gray-500 whitespace-normal">{n.course || "—"}</td>
                      <td className="py-3 px-4 text-gray-500">
                        <div>{date}</div>
                        <div className="text-xs text-gray-400">{time}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => editItem(n)} title="Edit"
                            className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => deleteItem(n.id)} title="Delete"
                            className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Showing {shown.length === 0 ? 0 : 1} to {shown.length} of {filtered.length} entries
        </p>
      </div>
    </AdminShell>
  );
}
