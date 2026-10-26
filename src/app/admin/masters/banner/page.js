"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";
import AdminShell from "@/components/portal/AdminShell";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { cldUrl } from "@/lib/img";
import { apiFetch } from "@/lib/api";

export default function BannerPage() {
  const confirmDialog = useConfirm();
  const fileRef = useRef(null);

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
              <p className="text-sm text-gray-500 mt-2">Banner should be in given ratio; <b>1536 × 496</b></p>
            </div>

            <button type="submit" disabled={saving}
              className="rounded-full btn-pill bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-7 py-2.5 shadow-sm shadow-rose-200 disabled:opacity-60 transition">
              {saving ? "Uploading…" : "Submit"}
            </button>
          </div>

          {/* Right: live preview */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Preview</p>
            <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden aspect-[1536/496] flex items-center justify-center">
              {previewSrc ? (
                <img src={previewSrc} alt="Banner preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon size={30} className="mx-auto mb-2" />
                  <p className="text-sm">Banner preview (1536 × 496)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* ---- Banners list ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Banners List</h3>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : banners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
            No banners uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {banners.map((b) => (
              <div key={b.id} className="relative rounded-xl border border-gray-200 overflow-hidden group">
                <div className="aspect-[1536/496] bg-gray-50">
                  <img src={cldUrl(b.image, { width: 800 })} alt="Banner" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${b.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {b.status}
                  </span>
                  <button onClick={() => remove(b.id)} title="Delete"
                    className="w-8 h-8 rounded-full btn-pill bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
