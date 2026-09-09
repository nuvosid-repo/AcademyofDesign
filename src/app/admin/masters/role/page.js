"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, ShieldCheck } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import Checkbox from "@/components/portal/Checkbox";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { apiFetch } from "@/lib/api";
import { PERMISSION_GROUPS } from "@/lib/rolePermissions";

export default function RolePage() {
  const confirmDialog = useConfirm();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [roleName, setRoleName] = useState("");
  const [perms, setPerms] = useState({}); // { moduleKey: string[] }
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);

  const load = () => {
    apiFetch("/api/roles", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRoles(d.roles || []))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  /* permission helpers */
  const actionChecked = (mk, a) => (perms[mk] || []).includes(a);
  const moduleAllChecked = (mk, actions) => actions.length > 0 && actions.every((a) => actionChecked(mk, a));

  const toggleAction = (mk, a) => {
    setPerms((p) => {
      const cur = new Set(p[mk] || []);
      cur.has(a) ? cur.delete(a) : cur.add(a);
      return { ...p, [mk]: [...cur] };
    });
  };
  const toggleModule = (mk, actions) => {
    setPerms((p) => {
      const all = moduleAllChecked(mk, actions);
      return { ...p, [mk]: all ? [] : [...actions] };
    });
  };

  const resetForm = () => {
    setRoleName("");
    setPerms({});
    setEditingId(null);
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!roleName.trim()) { setError("Role name is required"); return; }
    setSaving(true);
    try {
      const cleaned = Object.fromEntries(Object.entries(perms).filter(([, v]) => v && v.length));
      const payload = { name: roleName.trim(), permissions: cleaned };
      const res = editingId
        ? await apiFetch(`/api/roles/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  };

  const editRole = (role) => {
    setEditingId(role.id);
    setRoleName(role.name);
    setPerms(role.permissions || {});
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRole = async (id) => {
    const ok = await confirmDialog({ title: "Delete role?", text: "This role will be permanently removed." });
    if (!ok) return;
    setRoles((rs) => rs.filter((r) => r.id !== id));
    if (editingId === id) resetForm();
    await apiFetch(`/api/roles/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const filtered = roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  const shown = filtered.slice(0, pageSize);

  // count selected actions in a group (for the little badge)
  const groupCount = (grp) => grp.modules.reduce((n, m) => n + (perms[m.key]?.length || 0), 0);

  return (
    <AdminShell title="Role" subtitle="Manage roles and permissions.">
      {/* ---- Add / Edit Role form ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">{editingId ? "Edit Role" : "Add Role"}</h2>
            <p className="text-xs text-black">Set a name and pick the permissions for this role.</p>
          </div>
        </div>

        <div className="p-6 space-y-7">
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
          )}

          {/* Role name */}
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role Name <span className="text-rose-500">*</span>
            </label>
            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Manager"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] focus:bg-white focus:ring-2 focus:ring-rose-100 transition"
            />
          </div>

          {/* Permission groups */}
          <div className="space-y-6">
            {PERMISSION_GROUPS.map((grp) => (
              <section key={grp.group} className="rounded-2xl border border-gray-200 p-4 md:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#db254f] bg-rose-50 border border-rose-100 px-3 py-1 rounded-full btn-pill">
                    {grp.group}
                  </span>
                  {groupCount(grp) > 0 && (
                    <span className="text-xs text-gray-400">{groupCount(grp)} selected</span>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {grp.modules.map((m) => {
                    const allOn = moduleAllChecked(m.key, m.actions);
                    return (
                      <div
                        key={m.key}
                        className={`rounded-xl border overflow-hidden transition ${
                          allOn ? "border-rose-200 ring-1 ring-rose-100" : "border-gray-200 hover:border-rose-200"
                        }`}
                      >
                        <div className="flex items-center px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
                          <Checkbox
                            checked={allOn}
                            onChange={() => toggleModule(m.key, m.actions)}
                            label={<span className="font-semibold text-gray-800 text-sm">{m.label}</span>}
                          />
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-2.5 p-4">
                          {m.actions.map((a) => (
                            <Checkbox
                              key={a}
                              checked={actionChecked(m.key, a)}
                              onChange={() => toggleAction(m.key, a)}
                              label={<span className="text-sm text-gray-600">{a}</span>}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-7 py-2.5 shadow-sm shadow-rose-200 disabled:opacity-60 transition"
            >
              {saving ? "Saving…" : editingId ? "Update Role" : "Submit"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-800">
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      {/* ---- Roles table ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <h3 className="font-bold text-gray-900 mb-4">All Roles</h3>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <label className="text-sm text-gray-500 flex items-center gap-2">
            Show
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-300 rounded-xl px-2 py-1.5 text-sm outline-none"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </label>
          <label className="text-sm text-gray-500 flex items-center gap-2">
            Search:
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-[#db254f]"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>
                <th className="py-3 px-4 font-semibold rounded-l-lg">Sr. No.</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">No roles found.</td></tr>
              ) : (
                shown.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{r.name}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                        r.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => editRole(r)}
                          className="w-8 h-8 rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white flex items-center justify-center"
                          aria-label="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => deleteRole(r.id)}
                          className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center"
                          aria-label="Delete"
                        >
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
