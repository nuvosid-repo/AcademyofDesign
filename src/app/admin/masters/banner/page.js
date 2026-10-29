"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Image as ImageIcon, Eye, X } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { cldUrl } from "@/lib/cldImage";
import { apiFetch } from "@/lib/api";

const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
};

export default function BannerPage() {
  const confirmDialog = useConfirm();
  const fileRef = useRef(null);

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(null); // banner shown in the view modal

  const load = () =>
    apiFetch("/api/banners", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBanners(d.banners || []))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > 3 * 1024 * 1024) { setError("Image must be under 3MB"); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setImage("");
    setFileName("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!image) { setError("Please choose a banner image"); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/banners", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to upload"); return; }
      reset();
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const ok = await confirmDialog({ title: "Delete banner?", text: "This banner will be permanently removed." });
    if (!ok) return;
    setBanners((bs) => bs.filter((b) => b.id !== id));
    await apiFetch(`/api/banners/${id}`, { method: "DELETE" }).catch(() => {});
  };

  // Preview only reflects the file currently being chosen — it clears after
  // submit (existing banners live in the list below, not the preview).
  const previewSrc = image;

  return (
    <AdminShell title="Banner" subtitle="Manage homepage banners.">
      {/* ---- Add Banner ---- */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/60 to-transparent">
          <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#db254f] flex items-center justify-center">
            <ImageIcon size={18} />
          </span>
          <h2 className="font-bold text-gray-900">Add Banner</h2>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: upload */}
          <div className="space-y-4">
            {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Banner Image</label>
              <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden max-w-md">
                <label className="shrink-0 inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 text-sm text-gray-700 cursor-pointer border-r border-gray-200">
                  <Upload size={15} /> Choose file
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
                </label>
                <span className="px-3 text-sm text-gray-400 truncate">{fileName || "No file chosen"}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Recommended size (ratio ~2.4:1); <b>1200 × 500</b> — keep key content centered.</p>
            </div>

            <button type="submit" disabled={saving}
              className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-7 py-2.5 shadow-sm shadow-rose-200 disabled:opacity-60 transition">
              {saving ? "Uploading…" : "Submit"}
            </button>
          </div>

          {/* Right: live preview */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Preview</p>
            <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden aspect-[12/5] flex items-center justify-center">
              {previewSrc ? (
                <img src={previewSrc} alt="Banner preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon size={30} className="mx-auto mb-2" />
                  <p className="text-sm">Banner preview (1200 × 500)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* ---- Banners list ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Banners List</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="text-gray-500 text-left bg-gray-50">
              <tr>
                {[
                  { h: "Sr. No.", w: "w-[8%]" },
                  { h: "Banner", w: "w-[24%]" },
                  { h: "Status", w: "w-[15%]" },
                  { h: "Added On", w: "w-[25%]" },
                  { h: "Action", w: "w-[28%]" },
                ].map((c, i, a) => (
                  <th key={c.h} className={`py-3 px-4 font-semibold ${c.w} ${c.right ? "text-right" : ""} ${i === 0 ? "rounded-l-lg" : ""} ${i === a.length - 1 ? "rounded-r-lg" : ""}`}>{c.h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : banners.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400">No banners uploaded yet.</td></tr>
              ) : (
                banners.map((b, i) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{i + 1}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => setViewing(b)} className="block w-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-[12/5] hover:ring-2 hover:ring-[#db254f]/30 transition" title="View banner">
                        <img src={cldUrl(b.image, { width: 300 })} alt="Banner" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${b.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{fmtDate(b.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewing(b)} title="View"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 hover:border-[#db254f]/40 hover:text-[#db254f] text-gray-600 px-3 py-1.5 text-xs font-semibold transition">
                          <Eye size={14} /> View
                        </button>
                        <button onClick={() => remove(b.id)} title="Delete"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition">
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

        <p className="text-sm text-gray-500 mt-4">Showing {banners.length} {banners.length === 1 ? "entry" : "entries"}</p>
      </div>

      {/* ---- View banner modal ---- */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-rose-100 text-[#db254f] flex items-center justify-center"><ImageIcon size={16} /></span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">Banner Preview</h3>
                  <span className={`text-[11px] font-medium ${viewing.status === "Active" ? "text-emerald-600" : "text-gray-400"}`}>{viewing.status}</span>
                </div>
              </div>
              <button onClick={() => setViewing(null)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center transition" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="p-4 bg-gray-50">
              <div className="rounded-xl overflow-hidden border border-gray-200 aspect-[12/5] bg-white">
                <img src={cldUrl(viewing.image, { width: 1200 })} alt="Banner" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100">
              <a href={cldUrl(viewing.image, { width: 1600 })} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 hover:border-[#db254f]/40 hover:text-[#db254f] text-gray-600 px-3.5 py-2 text-sm font-semibold transition">
                <Eye size={15} /> Open full size
              </a>
              <button onClick={() => { const id = viewing.id; setViewing(null); remove(id); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white px-3.5 py-2 text-sm font-semibold transition">
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
