"use client";
import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, GraduationCap, User, Upload, Plus, Video, Award, Layers } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { cldUrl } from "@/lib/img";
import { apiFetch } from "@/lib/api";

const EMPTY = {
  name: "", role: "", designation: "", url: "", image: "", status: "Active",
  bio: "", education: "", experience: "", videoUrl: "", videoCaption: "",
  credentials: [""], memberships: [""], expertise: [""],
  details: [],
};

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

  // Simple string-list helpers (credentials / memberships / expertise)
  const addStr = (key) => setForm((f) => ({ ...f, [key]: [...(f[key] || []), ""] }));
  const setStr = (key, i, v) => setForm((f) => ({ ...f, [key]: f[key].map((x, j) => (j === i ? v : x)) }));
  const rmStr = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, j) => j !== i) }));

  // Detail sections
  const addDetail = () => setForm((f) => ({ ...f, details: [...(f.details || []), { title: "", variant: "paragraph", content: "", items: [] }] }));
  const setDetail = (i, k, v) => setForm((f) => ({ ...f, details: f.details.map((d, j) => (j === i ? { ...d, [k]: v } : d)) }));
  const rmDetail = (i) => setForm((f) => ({ ...f, details: f.details.filter((_, j) => j !== i) }));
  const addDItem = (i) => setForm((f) => ({ ...f, details: f.details.map((d, j) => (j === i ? { ...d, items: [...(d.items || []), ""] } : d)) }));
  const setDItem = (i, k, v) => setForm((f) => ({ ...f, details: f.details.map((d, j) => (j === i ? { ...d, items: d.items.map((x, m) => (m === k ? v : x)) } : d)) }));
  const rmDItem = (i, k) => setForm((f) => ({ ...f, details: f.details.map((d, j) => (j === i ? { ...d, items: d.items.filter((_, m) => m !== k) } : d)) }));

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
    setForm(EMPTY); setFileName(""); setEditingId(null); setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.designation.trim()) { setError("Name and designation are required"); return; }
    setSaving(true);
    try {
      const res = editingId
        ? await apiFetch(`/api/instructors/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        : await apiFetch("/api/instructors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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
    setForm({
      name: i.name || "", role: i.role || "", designation: i.designation || "", url: i.url || "", image: i.image || "", status: i.status || "Active",
      bio: i.bio || "", education: i.education || "", experience: i.experience || "", videoUrl: i.videoUrl || "", videoCaption: i.videoCaption || "",
      credentials: (i.credentials && i.credentials.length) ? [...i.credentials] : [""],
      memberships: (i.memberships && i.memberships.length) ? [...i.memberships] : [""],
      expertise: (i.expertise && i.expertise.length) ? [...i.expertise] : [""],
      details: (i.details && i.details.length) ? i.details.map((d) => ({ title: d.title || "", variant: d.variant || "paragraph", content: d.content || "", items: d.items ? [...d.items] : [] })) : [],
    });
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

  const filtered = items.filter((i) => [i.name, i.designation, i.role].join(" ").toLowerCase().includes(search.toLowerCase()));
  const shown = filtered.slice(0, pageSize);

  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white transition";
  const label = "block text-sm text-gray-600 mb-1.5";
  const Req = () => <span className="text-rose-500"> *</span>;

  // Reusable string-list block
  const StringList = ({ title, keyName, placeholder }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <button type="button" onClick={() => addStr(keyName)} className="inline-flex items-center gap-1 text-xs text-[#db254f] font-medium hover:underline"><Plus size={13} /> Add</button>
      </div>
      <div className="space-y-2">
        {(form[keyName] || []).map((v, i) => (
          <div key={i} className="flex gap-2">
            <input className={field} placeholder={placeholder} value={v} onChange={(e) => setStr(keyName, i, e.target.value)} />
            {form[keyName].length > 1 && <button type="button" onClick={() => rmStr(keyName, i)} className="shrink-0 w-10 rounded-xl border border-gray-200 text-gray-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center"><Trash2 size={15} /></button>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AdminShell title="Instructors" subtitle="Manage instructors / mentors shown on the website.">
      {/* ---- Add / Edit ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center"><GraduationCap size={18} /></span>
          <h2 className="font-bold text-gray-900">{editingId ? "Edit Instructor" : "Add Instructor"}</h2>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          {/* Basic */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div><label className={label}>Name<Req /></label><input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div><label className={label}>Role<span className="text-gray-400 text-xs"> (short, on cards)</span></label><input className={field} placeholder="e.g. Structural Engineer" value={form.role} onChange={(e) => set("role", e.target.value)} /></div>
            <div><label className={label}>Designation<Req /></label><input className={field} value={form.designation} onChange={(e) => set("designation", e.target.value)} /></div>
            <div><label className={label}>Status</label>
              <select className={field} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div><label className={label}>Education</label><input className={field} placeholder="B.Tech Civil, M.Tech" value={form.education} onChange={(e) => set("education", e.target.value)} /></div>
            <div><label className={label}>Experience</label><input className={field} placeholder="12+ Years" value={form.experience} onChange={(e) => set("experience", e.target.value)} /></div>
            <div><label className={label}>Profile URL</label><input className={field} placeholder="https://…" value={form.url} onChange={(e) => set("url", e.target.value)} /></div>
            <div>
              <label className={label}>Photo</label>
              <div className="flex items-center gap-3">
                <label className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600 cursor-pointer hover:bg-gray-100">
                  <Upload size={15} /> Choose file
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
                </label>
                {form.image && <img src={cldUrl(form.image, { width: 80 })} alt="" loading="lazy" decoding="async" className="w-9 h-9 rounded-full btn-pill object-cover border border-gray-200" />}
              </div>
              <input className={`${field} mt-2`} placeholder="…or paste photo URL" value={form.image?.startsWith("data:") ? "" : form.image} onChange={(e) => { set("image", e.target.value); setFileName(""); }} />
            </div>
          </div>

          <div><label className={label}>Bio</label><textarea rows={3} className={`${field} resize-y`} placeholder="Short professional bio…" value={form.bio} onChange={(e) => set("bio", e.target.value)} /></div>

          {/* Video */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4"><Video size={16} className="text-[#db254f]" /> Intro Video</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={label}>Video URL</label><input className={field} placeholder="YouTube / Vimeo link" value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} /></div>
              <div><label className={label}>Video Caption</label><input className={field} value={form.videoCaption} onChange={(e) => set("videoCaption", e.target.value)} /></div>
            </div>
          </div>

          {/* Credentials / Memberships / Expertise */}
          <div className="border-t border-gray-100 pt-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            {StringList({ title: "Credentials", keyName: "credentials", placeholder: "e.g. B.Tech Civil" })}
            {StringList({ title: "Memberships", keyName: "memberships", placeholder: "e.g. Member IIID" })}
            {StringList({ title: "Areas of Expertise", keyName: "expertise", placeholder: "e.g. Structural Modeling" })}
          </div>

          {/* Detail sections */}
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Layers size={16} className="text-[#db254f]" /> Detail Sections</h3>
              <button type="button" onClick={addDetail} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white px-4 py-2 transition"><Plus size={15} /> Add Section</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Rich sections shown on the mentor detail page (e.g. Industry Experience, Projects, Companies).</p>
            {form.details.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-400 text-sm">No sections yet.</div>
            ) : (
              <div className="space-y-4">
                {form.details.map((d, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-col sm:flex-row gap-3 mb-3">
                      <input className={field} placeholder="Section title" value={d.title} onChange={(e) => setDetail(i, "title", e.target.value)} />
                      <select className={`${field} sm:max-w-[12rem]`} value={d.variant} onChange={(e) => setDetail(i, "variant", e.target.value)}>
                        <option value="paragraph">Paragraph</option>
                        <option value="bullets">Bullet list</option>
                        <option value="tags">Tags</option>
                      </select>
                      <button type="button" onClick={() => rmDetail(i)} className="shrink-0 w-10 rounded-xl border border-gray-200 text-gray-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center"><Trash2 size={15} /></button>
                    </div>
                    {d.variant === "paragraph" ? (
                      <textarea rows={3} className={`${field} resize-y`} placeholder="Paragraph content…" value={d.content} onChange={(e) => setDetail(i, "content", e.target.value)} />
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">{d.variant === "tags" ? "Tags" : "Bullet points"}</span>
                          <button type="button" onClick={() => addDItem(i)} className="inline-flex items-center gap-1 text-xs text-[#db254f] font-medium hover:underline"><Plus size={13} /> Add item</button>
                        </div>
                        <div className="space-y-2">
                          {(d.items || []).map((it, k) => (
                            <div key={k} className="flex gap-2">
                              <input className={field} placeholder="Item" value={it} onChange={(e) => setDItem(i, k, e.target.value)} />
                              <button type="button" onClick={() => rmDItem(i, k)} className="shrink-0 w-10 rounded-xl border border-gray-200 text-gray-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center"><Trash2 size={15} /></button>
                            </div>
                          ))}
                          {(d.items || []).length === 0 && <p className="text-xs text-gray-400">No items yet.</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-7 py-2.5 shadow-sm shadow-rose-200 disabled:opacity-60 transition">
              {saving ? "Saving…" : editingId ? "Update" : "Submit"}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>}
          </div>
        </div>
      </form>

      {/* ---- List ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Instructors List</h3>
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
                {["Sr. No.", "Image", "Name", "Role", "Designation", "Status", "Actions"].map((h, i, a) => (
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
                      {i.image ? <img src={cldUrl(i.image, { width: 80 })} alt={i.name} loading="lazy" decoding="async" className="w-10 h-10 rounded-full btn-pill object-cover" /> : <span className="w-10 h-10 rounded-full btn-pill bg-gray-100 text-gray-400 flex items-center justify-center"><User size={18} /></span>}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{i.name}</td>
                    <td className="py-3 px-4 text-gray-500">{i.role || "—"}</td>
                    <td className="py-3 px-4 text-gray-500 whitespace-normal max-w-xs">{i.designation}</td>
                    <td className="py-3 px-4"><span className={`text-xs px-2.5 py-1 rounded-md font-medium ${i.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{i.status}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => editItem(i)} title="Edit" className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center"><Pencil size={15} /></button>
                        <button onClick={() => deleteItem(i.id)} title="Delete" className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center"><Trash2 size={15} /></button>
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
