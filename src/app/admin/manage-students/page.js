"use client";
import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, Eye, EyeOff, Upload, GraduationCap, X } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { DatePicker } from "@/components/portal/DateTimePicker";
import { apiFetch } from "@/lib/api";

const GENDERS = ["Male", "Female", "Other"];
const QUALIFICATIONS = ["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD", "Other"];
const SUBSCRIPTIONS = ["B2C", "B2B"];
const STATUSES = ["Active", "Inactive"];
const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Singapore", "United Arab Emirates", "Japan", "China", "Brazil", "South Africa", "Netherlands", "Italy", "Spain", "Mexico", "Saudi Arabia", "Nepal", "Bangladesh", "Sri Lanka", "New Zealand", "Ireland", "Sweden", "Other"];

const EMPTY = {
  name: "", email: "", dateOfBirth: "", gender: "Male", image: "", contactNumber: "",
  qualification: "Bachelor's Degree", institutionName: "", country: "India", address: "",
  identityProof: "", subscriptionType: "B2C", password: "", status: "Active",
};

export default function ManageStudentsPage() {
  const confirmDialog = useConfirm();
  const imgRef = useRef(null);
  const idRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [imgName, setImgName] = useState("");
  const [idName, setIdName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const load = () =>
    apiFetch("/api/manage-students", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.students || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = (key, setName, ref) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError("File must be under 3MB"); return; }
    setName(file.name);
    const reader = new FileReader();
    reader.onload = () => set(key, reader.result);
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setForm(EMPTY); setConfirmPassword(""); setImgName(""); setIdName("");
    setEditingId(null); setError(""); setShowPw(false); setShowCpw(false);
    if (imgRef.current) imgRef.current.value = "";
    if (idRef.current) idRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim()) { setError("Name and email are required"); return; }
    if (!editingId && !form.password) { setError("Password is required"); return; }
    if (form.password && form.password !== confirmPassword) { setError("Passwords do not match"); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editingId && !payload.password) delete payload.password;
      const res = editingId
        ? await apiFetch(`/api/manage-students/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await apiFetch("/api/manage-students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      reset();
      load();
    } finally {
      setSaving(false);
    }
  };

  const editItem = (s) => {
    setEditingId(s.id);
    setForm({
      name: s.name, email: s.email, dateOfBirth: s.dateOfBirth, gender: s.gender || "Male", image: s.image,
      contactNumber: s.contactNumber, qualification: s.qualification || "Bachelor's Degree", institutionName: s.institutionName,
      country: s.country || "India", address: s.address, identityProof: s.identityProof,
      subscriptionType: s.subscriptionType || "B2C", password: "", status: s.status || "Active",
    });
    setConfirmPassword("");
    setImgName(s.image ? "current image" : "");
    setIdName(s.identityProof ? "current file" : "");
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteItem = async (id) => {
    const ok = await confirmDialog({ title: "Delete student?", text: "This student will be permanently removed." });
    if (!ok) return;
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (editingId === id) reset();
    await apiFetch(`/api/manage-students/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const filtered = items.filter((s) =>
    [s.name, s.email, s.contactNumber, s.country].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const shown = filtered.slice(0, pageSize);

  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white transition";
  const label = "block text-sm text-gray-600 mb-1.5";
  const Req = () => <span className="text-rose-500"> *</span>;
  const FileField = ({ name, onChange, inputRef }) => (
    <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden">
      <label className="shrink-0 inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 text-sm text-gray-700 cursor-pointer border-r border-gray-200">
        <Upload size={15} /> Choose file
        <input ref={inputRef} type="file" onChange={onChange} className="hidden" />
      </label>
      <span className="px-3 text-xs text-gray-400 truncate">{name || "No file chosen"}</span>
    </div>
  );

  return (
    <AdminShell title="Students" subtitle="Add and manage students.">
      {/* ---- Add / Edit Student ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center"><GraduationCap size={18} /></span>
          <h2 className="font-bold text-gray-900">{editingId ? "Edit Student" : "Add Student"}</h2>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
            <div>
              <label className={label}>Name<Req /></label>
              <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className={label}>Email<Req /></label>
              <input type="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className={label}>Date of Birth</label>
              <DatePicker value={form.dateOfBirth} onChange={(v) => set("dateOfBirth", v)} placeholder="Select date of birth" />
            </div>

            <div>
              <label className={label}>Gender<Req /></label>
              <select className={field} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Image</label>
              <FileField name={imgName} onChange={onFile("image", setImgName, imgRef)} inputRef={imgRef} />
            </div>
            <div>
              <label className={label}>Contact Number</label>
              <input className={field} type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number"
                value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value.replace(/\D/g, "").slice(0, 10))} />
            </div>

            <div>
              <label className={label}>Qualification</label>
              <select className={field} value={form.qualification} onChange={(e) => set("qualification", e.target.value)}>
                {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Institution Name</label>
              <input className={field} value={form.institutionName} onChange={(e) => set("institutionName", e.target.value)} />
            </div>
            <div>
              <label className={label}>Country</label>
              <select className={field} value={form.country} onChange={(e) => set("country", e.target.value)}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className={label}>Address</label>
              <textarea rows={3} className={`${field} resize-y`} value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div>
              <label className={label}>Identity Proof</label>
              <FileField name={idName} onChange={onFile("identityProof", setIdName, idRef)} inputRef={idRef} />
            </div>
            <div>
              <label className={label}>Subscription Type<Req /></label>
              <select className={field} value={form.subscriptionType} onChange={(e) => set("subscriptionType", e.target.value)}>
                {SUBSCRIPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className={label}>Password{!editingId && <Req />}{editingId && <span className="text-gray-400 text-xs"> (blank = keep)</span>}</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} className={`${field} pr-11`} value={form.password} onChange={(e) => set("password", e.target.value)} />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">{showPw ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </div>
            <div>
              <label className={label}>Confirm Password{!editingId && <Req />}</label>
              <div className="relative">
                <input type={showCpw ? "text" : "password"} className={`${field} pr-11`} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                <button type="button" onClick={() => setShowCpw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">{showCpw ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </div>
            <div>
              <label className={label}>Status<Req /></label>
              <select className={field} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
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

      {/* ---- Students table ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Students List</h3>
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
                {["Sr. No.", "Image", "Name", "Email", "Contact", "Country", "Subscription", "Enrolled", "Status", "Actions"].map((h, i, a) => (
                  <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={10} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-gray-400">No students found.</td></tr>
              ) : (
                shown.map((s, i) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                    <td className="py-3 px-4">
                      {s.image ? <img src={s.image} alt={s.name} className="w-9 h-9 rounded-full object-cover" /> : <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs">{s.name?.charAt(0)?.toUpperCase() || "S"}</span>}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{s.name}</td>
                    <td className="py-3 px-4 text-gray-500">{s.email}</td>
                    <td className="py-3 px-4 text-gray-500">{s.contactNumber || "—"}</td>
                    <td className="py-3 px-4 text-gray-500">{s.country || "—"}</td>
                    <td className="py-3 px-4 text-gray-500">{s.subscriptionType}</td>
                    <td className="py-3 px-4">
                      {s.enrolledCount > 0
                        ? <span title={(s.enrolledCourses || []).join(", ")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium bg-emerald-100 text-emerald-700">Enrolled · {s.enrolledCount}</span>
                        : <span className="text-xs px-2.5 py-1 rounded-md font-medium bg-gray-100 text-gray-400">Not enrolled</span>}
                    </td>
                    <td className="py-3 px-4"><span className={`text-xs px-2.5 py-1 rounded-md font-medium ${s.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{s.status}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewing(s)} title="View" className="w-8 h-8 rounded-full btn-pill bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"><Eye size={14} /></button>
                        <button onClick={() => editItem(s)} title="Edit" className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center"><Pencil size={14} /></button>
                        <button onClick={() => deleteItem(s.id)} title="Delete" className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center"><Trash2 size={14} /></button>
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

      {/* ---- View Student modal ---- */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent sticky top-0">
              <h2 className="font-bold text-gray-900">Student Details</h2>
              <button onClick={() => setViewing(null)} title="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                {viewing.image
                  ? <img src={viewing.image} alt={viewing.name} className="w-16 h-16 rounded-full object-cover" />
                  : <span className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xl">{viewing.name?.charAt(0)?.toUpperCase() || "S"}</span>}
                <div>
                  <div className="font-bold text-gray-900 text-lg">{viewing.name}</div>
                  <div className="text-sm text-gray-500">{viewing.email}</div>
                  <span className={`inline-block mt-1 text-xs px-2.5 py-1 rounded-md font-medium ${viewing.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{viewing.status || "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                {[
                  ["Contact Number", viewing.contactNumber],
                  ["Date of Birth", viewing.dateOfBirth],
                  ["Gender", viewing.gender],
                  ["Qualification", viewing.qualification],
                  ["Institution Name", viewing.institutionName],
                  ["Country", viewing.country],
                  ["Subscription Type", viewing.subscriptionType],
                  ["Address", viewing.address],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">{k}</div>
                    <div className="text-sm text-gray-800 break-words">{v || "—"}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Enrolled Courses {viewing.enrolledCount > 0 ? `(${viewing.enrolledCount})` : ""}</div>
                {viewing.enrolledCount > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(viewing.enrolledCourses || []).map((c) => (
                      <span key={c} className="inline-flex items-center text-xs px-2.5 py-1 rounded-md font-medium bg-emerald-100 text-emerald-700">{c}</span>
                    ))}
                  </div>
                ) : <div className="text-sm text-gray-400">Not enrolled in any course yet.</div>}
              </div>

              {viewing.identityProof && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Identity Proof</div>
                  {String(viewing.identityProof).startsWith("data:image")
                    ? <img src={viewing.identityProof} alt="Identity proof" className="max-h-48 rounded-lg border border-gray-200" />
                    : <a href={viewing.identityProof} target="_blank" rel="noopener noreferrer" className="text-sm text-[#db254f] hover:underline">View uploaded file</a>}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { const s = viewing; setViewing(null); editItem(s); }} className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-6 py-2 transition">Edit</button>
              <button onClick={() => setViewing(null)} className="text-sm text-gray-500 hover:text-gray-800">Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
