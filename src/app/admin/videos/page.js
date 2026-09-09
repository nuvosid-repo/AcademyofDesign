"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Eye, Video as VideoIcon } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import SearchSelect from "@/components/portal/SearchSelect";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { apiFetch } from "@/lib/api";

const EMPTY = { title: "", url: "", course: "", status: "Active", description: "" };

function fmtDate(d) {
  try {
    const dt = new Date(d);
    const date = dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const time = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return `${date} ${time}`;
  } catch { return "—"; }
}

export default function VideosPage() {
  const confirmDialog = useConfirm();

  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const load = () =>
    apiFetch("/api/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    apiFetch("/api/courses", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCourses(d.courses || []))
      .catch(() => setCourses([]));
  }, []);

  const courseTitles = useMemo(() => courses.map((c) => c.title), [courses]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => { setForm(EMPTY); setEditingId(null); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.url.trim() || !form.course || !form.description.trim()) {
      setError("Please fill all required fields (*)");
      return;
    }
    setSaving(true);
    try {
      const courseId = courses.find((c) => c.title === form.course)?.id || "";
      const payload = { ...form, courseId };
      const res = editingId
        ? await apiFetch(`/api/videos/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await apiFetch("/api/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      reset();
      load();
    } finally {
      setSaving(false);
    }
  };

  const editVideo = (v) => {
    setEditingId(v.id);
    setForm({ title: v.title, url: v.url, course: v.course, status: v.status, description: v.description });
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteVideo = async (id) => {
    const ok = await confirmDialog({ title: "Delete video?", text: "This video will be permanently removed." });
    if (!ok) return;
    setVideos((xs) => xs.filter((x) => x.id !== id));
    if (editingId === id) reset();
    await apiFetch(`/api/videos/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const filtered = videos
    .filter((v) => (courseFilter ? v.course === courseFilter : true))
    .filter((v) => [v.title, v.url, v.course].join(" ").toLowerCase().includes(search.toLowerCase()));
  const shown = filtered.slice(0, pageSize);

  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white transition";
  const label = "block text-sm text-gray-600 mb-1.5";
  const Req = () => <span className="text-rose-500"> *</span>;

  return (
    <AdminShell title="Videos" subtitle="Add course videos (multiple per course).">
      {/* ---- Add / Edit Video ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center"><VideoIcon size={18} /></span>
          <h2 className="font-bold text-gray-900">{editingId ? "Edit Video" : "Add Video"}</h2>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className={label}>Title<Req /></label>
              <input className={field} placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <label className={label}>URL<Req /></label>
              <input className={field} placeholder="https://vimeo.com/…" value={form.url} onChange={(e) => set("url", e.target.value)} />
            </div>
            <div>
              <label className={label}>Course<Req /></label>
              <SearchSelect options={courseTitles} value={form.course} onChange={(v) => set("course", v)} />
            </div>
            <div>
              <label className={label}>Status<Req /></label>
              <select className={field} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="Active">ACTIVE</option>
                <option value="Inactive">INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Description<Req /></label>
            <textarea rows={4} className={`${field} resize-y`} placeholder="Description" value={form.description} onChange={(e) => set("description", e.target.value)} />
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

      {/* ---- Videos table ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-500 flex items-center gap-2">
              Show
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-gray-300 rounded-xl px-2 py-1.5 text-sm outline-none">
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              entries
            </label>
            {/* Filter by course — helps manage many videos per course */}
            <div className="w-56">
              <SearchSelect options={courseTitles} value={courseFilter} onChange={setCourseFilter} placeholder="All courses" />
            </div>
          </div>
          <label className="text-sm text-gray-500 flex items-center gap-2">
            Search:
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-[#db254f]" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>
                {["Sr. No.", "Title", "Url", "Course", "Date Created", "Status", "Action"].map((h, i, a) => (
                  <th key={h} className={`py-3 px-4 font-semibold whitespace-nowrap ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No videos found.</td></tr>
              ) : (
                shown.map((v, i) => (
                  <tr key={v.id} className="hover:bg-gray-50 align-top">
                    <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900 whitespace-normal max-w-[12rem]">{v.title}</td>
                    <td className="py-3 px-4"><a href={v.url} target="_blank" rel="noreferrer" className="text-[#db254f] hover:underline break-all">{v.url}</a></td>
                    <td className="py-3 px-4 text-gray-500 whitespace-normal max-w-[14rem]">{v.course || "—"}</td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmtDate(v.createdAt)}</td>
                    <td className="py-3 px-4"><span className={`text-xs px-2.5 py-1 rounded-md font-medium ${v.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{v.status}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => editVideo(v)} title="Edit" className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center"><Pencil size={14} /></button>
                        <a href={v.url} target="_blank" rel="noreferrer" title="View" className="w-8 h-8 rounded-full btn-pill bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center"><Eye size={14} /></a>
                        <button onClick={() => deleteVideo(v.id)} title="Delete" className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center"><Trash2 size={14} /></button>
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
