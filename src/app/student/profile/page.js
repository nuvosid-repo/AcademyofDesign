"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, User as UserIcon } from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { apiFetch } from "@/lib/api";
import { cldUrl } from "@/lib/cldImage";

const GENDERS = ["Male", "Female", "Other"];

// Fields that count toward "profile completion".
const COMPLETION_FIELDS = ["image", "name", "contactNumber", "institutionName", "qualification", "gender", "dateOfBirth", "country", "address"];

function completion(p) {
  if (!p) return 0;
  const filled = COMPLETION_FIELDS.filter((k) => (p[k] || "").toString().trim()).length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

/* Circular progress ring drawn around the avatar. */
function AvatarRing({ pct, children }) {
  const r = 46, C = 2 * Math.PI * r;
  const done = pct >= 100;
  const color = done ? "#10b981" : "#db254f";
  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(var(--fg-rgb),0.12)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s" }} />
      </svg>
      <div className="absolute inset-2 rounded-full overflow-hidden flex items-center justify-center">{children}</div>
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[11px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: color }}>{pct}%</span>
    </div>
  );
}

export default function StudentProfilePage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    apiFetch("/api/student/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setForm(d.profile || null))
      .catch(() => setErr("Could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setErr("Image must be under 3 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => set("image", reader.result);
    reader.readAsDataURL(file);
  };

  const save = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!form.name?.trim()) { setErr("Name is required."); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/student/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (res.ok) {
        setForm(d.profile); setMsg("Profile updated successfully.");
        // Update the portal avatar (topbar) live, and refresh the session so the
        // new name shows in the welcome card / top bar without a reload.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("profile-image", { detail: d.profile.image || "" }));
          window.dispatchEvent(new Event("nuvosid-auth-changed"));
        }
      } else setErr(d.error || "Failed to update profile.");
    } finally { setSaving(false); }
  };

  const pct = completion(form);
  const inputCls = "w-full rounded-xl border pf-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[#db254f] transition";
  const roCls = "w-full rounded-xl border pf-border px-3.5 py-2.5 text-sm pf-muted cursor-not-allowed";
  const lbl = "block text-sm font-medium mb-1.5";

  if (loading) return <StudentShell subtitle="Profile"><div className="flex items-center gap-2 pf-muted"><Loader2 className="animate-spin" size={18} /> Loading…</div></StudentShell>;
  if (!form) return <StudentShell subtitle="Profile"><p className="pf-muted">{err || "Profile unavailable."}</p></StudentShell>;

  return (
    <StudentShell subtitle="Profile">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">My Profile</h2>
        <p className="pf-muted">Complete your profile so we can personalise your experience.</p>
      </div>

      <form onSubmit={save} className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Left — avatar + completion */}
        <div className="pf-card p-6 flex flex-col items-center text-center lg:sticky lg:top-4">
          <AvatarRing pct={pct}>
            {form.image ? (
              <img src={cldUrl(form.image, { width: 240 })} alt="Profile" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center pf-chip"><UserIcon size={30} /></div>
            )}
          </AvatarRing>
          <h3 className="font-bold mt-5">{form.name || "Your Profile"}</h3>
          <p className="text-xs pf-muted mt-1 px-2">{pct >= 100 ? "Your profile is 100% complete 🎉" : `${pct}% complete — fill the remaining fields.`}</p>
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold rounded-full border pf-border px-4 py-2 pf-hover transition">
            <Camera size={15} className="text-[#db254f]" /> {form.image ? "Change photo" : "Upload photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onImage} />

          <div className="w-full mt-6 pt-5 border-t pf-border text-left">
            <div className="flex items-center justify-between text-sm mb-2"><span className="pf-muted">Profile completion</span><span className="font-bold" style={{ color: pct >= 100 ? "#10b981" : "#db254f" }}>{pct}%</span></div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(var(--fg-rgb),0.1)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#10b981" : "#db254f" }} />
            </div>
          </div>
        </div>

        {/* Right — form fields */}
        <div className="lg:col-span-2 pf-card p-6">
          <h3 className="font-bold text-lg">Personal Details</h3>
          <p className="text-sm pf-muted mb-5">Edit your personal information.</p>

          {err && <div className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 mb-4">{err}</div>}
          {msg && <div className="text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">{msg}</div>}

          <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            <div><label className={lbl}>Name</label><input className={inputCls} value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" /></div>
            <div><label className={lbl}>Contact Number</label><input className={inputCls} value={form.contactNumber || ""} onChange={(e) => set("contactNumber", e.target.value)} placeholder="Phone number" /></div>

            <div><label className={lbl}>Institution Name</label><input className={inputCls} value={form.institutionName || ""} onChange={(e) => set("institutionName", e.target.value)} placeholder="School / college" /></div>
            <div><label className={lbl}>Qualification</label><input className={inputCls} value={form.qualification || ""} onChange={(e) => set("qualification", e.target.value)} placeholder="e.g. Bachelor's Degree" /></div>

            <div><label className={lbl}>Gender</label>
              <select className={inputCls} value={form.gender || ""} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select gender</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Date Of Birth</label><input type="date" className={inputCls} value={form.dateOfBirth || ""} onChange={(e) => set("dateOfBirth", e.target.value)} /></div>

            <div><label className={lbl}>Email <span className="pf-faint font-normal">(can&apos;t be changed)</span></label><input className={roCls} value={form.email || ""} readOnly /></div>
            <div><label className={lbl}>Country</label><input className={inputCls} value={form.country || ""} onChange={(e) => set("country", e.target.value)} placeholder="Country" /></div>

            <div className="md:col-span-2"><label className={lbl}>Address</label><textarea rows={3} className={`${inputCls} resize-y`} value={form.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="Your address" /></div>
          </div>

          <div className="mt-6 pt-5 border-t pf-border">
            <button type="submit" disabled={saving} className="btn-pill inline-flex items-center gap-2 bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-6 py-2.5 shadow-md shadow-rose-500/30 transition disabled:opacity-60">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Check size={16} /> Update Profile</>}
            </button>
          </div>
        </div>
      </form>
    </StudentShell>
  );
}
