"use client";
import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, GraduationCap, User, Upload } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { apiFetch } from "@/lib/api";

const EMPTY = { name: "", designation: "", url: "", image: "", status: "" };

export default function InstructorsPage() {
  const confirmDialog = useConfirm();
  const fileRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [fileName, setFileName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const load = () =>
    apiFetch("/api/instructors", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.instructors || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Image must be under 2MB"); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => set("image", reader.result);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm(EMPTY);
    setFileName("");
    setEditingId(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.designation.trim() || !form.status) {
      setError("Please fill all required fields (*)");
      return;
    }
    setSaving(true);
    try {
      const res = editingId
        ? await apiFetch(`/api/instructors/${editingId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
          })
        : await apiFetch("/api/instructors", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
          });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  };

  const editItem = (i) => {
    setEditingId(i.id);
    setForm({ name: i.name, designation: i.designation, url: i.url, image: i.image, status: i.status });
    setFileName(i.image ? "current image" : "");
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteItem = async (id) => {
    const ok = await confirmDialog({ title: "Delete instructor?", text: "This instructor will be permanently removed." });
    if (!ok) return;
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (editingId === id) resetForm();
    await apiFetch(`/api/instructors/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const filtered = items.filter((i) =>
    [i.name, i.designation, i.url].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const shown = filtered.slice(0, pageSize);

  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white transition";
  const Req = () => <span className="text-rose-500"> *</span>;

  return (
    <AdminShell title="Instructors" subtitle="Manage instructors / mentors.">
      {/* ---- Add / Edit Instructor ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center">
            <GraduationCap size={18} />
          </span>
          <h2 className="font-bold text-gray-900">{editingId ? "Edit Instructor" : "Add Instructor"}</h2>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Name<Req /></label>
              <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Designation<Req /></label>
              <input className={field} value={form.designation} onChange={(e) => set("designation", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">URL</label>
              <input className={field} placeholder="https://…" value={form.url} onChange={(e) => set("url", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Image</label>
              <div className="flex items-center gap-3">
                <label className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600 cursor-pointer hover:bg-gray-100">
                  <Upload size={15} /> Choose file
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
                </label>
                <span className="text-xs text-gray-400 truncate">{fileName || "No file chosen"}</span>
                {form.image && <img src={form.image} alt="" className="w-9 h-9 rounded-full btn-pill object-cover border border-gray-200" />}
              </div>
            </div>
          </div>

          <div className="max-w-xs">
            <label className="block text-sm text-gray-600 mb-1.5">Status<Req /></label>
            <select className={field} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="">--Select--</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-7 py-2.5 shadow-sm shadow-rose-200 disabled:opacity-60 transition">
              {saving ? "Saving…" : editingId ? "Update" : "Submit"}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>}
          </div>
        </div>
      </form>

      {/* ---- Instructors list ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Instructors List</h3>
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
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>
                {["Sr. No.", "Image", "Name", "Designation", "URL", "Status", "Actions"].map((h, i, a) => (
                  <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No instructors found.</td></tr>
              ) : (
                shown.map((i, idx) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{idx + 1}</td>
                    <td className="py-3 px-4">
                      {i.image ? (
                        <img src={i.image} alt={i.name} className="w-10 h-10 rounded-full btn-pill object-cover" />
                      ) : (
                        <span className="w-10 h-10 rounded-full btn-pill bg-gray-100 text-gray-400 flex items-center justify-center"><User size={18} /></span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{i.name}</td>
                    <td className="py-3 px-4 text-gray-500 whitespace-normal max-w-xs">{i.designation}</td>
                    <td className="py-3 px-4">
                      {i.url ? <a href={i.url} target="_blank" rel="noreferrer" className="text-[#db254f] hover:underline">{i.url}</a> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${i.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{i.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => editItem(i)} title="Edit"
                          className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => deleteItem(i.id)} title="Delete"
                          className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
