"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, KeyRound, Eye, EyeOff, UserPlus, X } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import SearchSelect from "@/components/portal/SearchSelect";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { apiFetch } from "@/lib/api";

const EMPTY = { name: "", email: "", contactNo: "", role: "", username: "", password: "" };

export default function UserPage() {
  const confirmDialog = useConfirm();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(EMPTY);
  const [showPass, setShowPass] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const loadUsers = () =>
    apiFetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadUsers();
    apiFetch("/api/roles", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRoles((d.roles || []).map((r) => r.name)))
      .catch(() => setRoles([]));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const resetForm = () => { setForm(EMPTY); setEditingId(null); setError(""); setShowPass(false); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.username.trim() || (!editingId && !form.password)) {
      setError("Please fill all required fields (*)");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editingId && !payload.password) delete payload.password; // keep old password on edit
      const res = editingId
        ? await apiFetch(`/api/users/${editingId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          })
        : await apiFetch("/api/users", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      resetForm();
      loadUsers();
    } finally {
      setSaving(false);
    }
  };

  const editUser = (u) => {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, contactNo: u.contactNo, role: u.role, username: u.username, password: "" });
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteUser = async (id) => {
    const ok = await confirmDialog({ title: "Delete user?", text: "This user will be permanently removed." });
    if (!ok) return;
    setUsers((us) => us.filter((u) => u.id !== id));
    if (editingId === id) resetForm();
    await apiFetch(`/api/users/${id}`, { method: "DELETE" }).catch(() => {});
  };

  // ---- change-password modal ----
  const [pwUser, setPwUser] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwDone, setPwDone] = useState(false);

  const openPw = (u) => { setPwUser(u); setNewPw(""); setPwError(""); setPwDone(false); setShowNewPw(false); };
  const closePw = () => setPwUser(null);

  const savePw = async () => {
    if (!newPw || newPw.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    setSavingPw(true);
    setPwError("");
    try {
      const res = await apiFetch(`/api/users/${pwUser.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPwError(data.error || "Failed to change password"); return; }
      setPwDone(true);
      setTimeout(closePw, 900);
    } finally {
      setSavingPw(false);
    }
  };

  const filtered = users.filter((u) =>
    [u.name, u.email, u.username, u.role].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const shown = filtered.slice(0, pageSize);

  const field = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white transition";
  const Req = () => <span className="text-rose-500"> *</span>;

  return (
    <AdminShell title="User" subtitle="Manage panel users and their roles.">
      {/* ---- Add / Edit User ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center">
            <UserPlus size={18} />
          </span>
          <h2 className="font-bold text-gray-900">{editingId ? "Edit User" : "Add User"}</h2>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Name<Req /></label>
              <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Email<Req /></label>
              <input type="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Contact No.</label>
              <input className={field} value={form.contactNo} onChange={(e) => set("contactNo", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Role<Req /></label>
              <SearchSelect options={roles} value={form.role} onChange={(v) => set("role", v)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Username<Req /></label>
              <input className={field} value={form.username} onChange={(e) => set("username", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Password{!editingId && <Req />}
                {editingId && <span className="text-gray-400 text-xs"> (leave blank to keep)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className={`${field} pr-11`}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
                <button type="button" onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
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

      {/* ---- Users table ---- */}
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
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>
                {["Sr. No.", "Name", "Email", "Contact No.", "Role", "Username", "Status", "Actions"].map((h, i) => (
                  <th key={h} className={`py-3 px-4 font-semibold ${i === 0 ? "rounded-l-lg" : ""} ${i === 7 ? "rounded-r-lg" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">No users found.</td></tr>
              ) : (
                shown.map((u, i) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{u.name}</td>
                    <td className="py-3 px-4 text-gray-500">{u.email}</td>
                    <td className="py-3 px-4 text-gray-500">{u.contactNo || "—"}</td>
                    <td className="py-3 px-4 text-gray-500">{u.role || "—"}</td>
                    <td className="py-3 px-4 text-gray-500">{u.username}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                        u.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>{u.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => editUser(u)} title="Edit"
                          className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => deleteUser(u.id)} title="Delete"
                          className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center">
                          <Trash2 size={15} />
                        </button>
                        <button onClick={() => openPw(u)} title="Change Password"
                          className="w-8 h-8 rounded-full btn-pill bg-gray-800 hover:bg-black text-white flex items-center justify-center">
                          <KeyRound size={14} />
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

      {/* ---- Change Password modal ---- */}
      {pwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closePw} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-rose-100 text-[#db254f] flex items-center justify-center">
                  <KeyRound size={16} />
                </span>
                <h3 className="font-bold text-gray-900">Change Password</h3>
              </div>
              <button onClick={closePw} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Set a new password for <span className="font-medium text-gray-800">{pwUser.name}</span> ({pwUser.username}).
              </p>

              {pwError && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{pwError}</div>}
              {pwDone && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">Password changed ✓</div>}

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">New Password<span className="text-rose-500"> *</span></label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && savePw()}
                    className={`${field} pr-11`}
                    placeholder="Min 6 characters"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowNewPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {showNewPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closePw} className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2">Cancel</button>
              <button onClick={savePw} disabled={savingPw || pwDone}
                className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-6 py-2.5 disabled:opacity-60 transition">
                {savingPw ? "Saving…" : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
