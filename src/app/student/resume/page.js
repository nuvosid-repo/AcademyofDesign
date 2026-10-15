"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Download, Save, Check, Loader2, GraduationCap, Briefcase, Sparkles } from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { useSession } from "@/context/SessionContext";
import { apiFetch } from "@/lib/api";

const BLANK = {
  name: "", title: "", email: "", phone: "", location: "", website: "",
  summary: "",
  education: [{ school: "", degree: "", year: "" }],
  experience: [{ company: "", role: "", period: "", details: "" }],
  skills: "",
};

const STORAGE_KEY = "nuvosid_resume";

export default function ResumeBuilderPage() {
  const { user } = useSession();
  const [r, setR] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const printRef = useRef(null);

  // Load the saved resume from the DB; fall back to a local draft / session name.
  useEffect(() => {
    const fromLocal = () => {
      try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { setR({ ...BLANK, ...JSON.parse(saved) }); return true; } } catch {}
      return false;
    };
    apiFetch("/api/student/resume", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => {
        if (d.resume) {
          const x = d.resume;
          setR({
            ...BLANK,
            name: x.name, title: x.title, email: x.email, phone: x.phone, location: x.location, website: x.website, summary: x.summary, skills: x.skills,
            education: x.education?.length ? x.education : BLANK.education,
            experience: x.experience?.length ? x.experience : BLANK.experience,
          });
          return;
        }
        if (!fromLocal() && user?.name) setR((prev) => ({ ...prev, name: user.name }));
      })
      .catch(() => { fromLocal(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const save = async () => {
    setSaving(true); setSavedMsg("");
    try {
      const res = await apiFetch("/api/student/resume", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r),
      });
      const d = await res.json();
      if (res.ok) setSavedMsg(d.resume?.completed ? "Saved — your resume is complete ✓" : "Saved — fill all sections to mark it complete");
      else setSavedMsg(d.error || "Could not save");
    } catch { setSavedMsg("Could not save"); }
    finally { setSaving(false); }
  };

  // Persist draft.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); } catch {}
  }, [r]);

  const set = (k, v) => setR((x) => ({ ...x, [k]: v }));
  const setEdu = (i, k, v) => setR((x) => ({ ...x, education: x.education.map((e, j) => (j === i ? { ...e, [k]: v } : e)) }));
  const setExp = (i, k, v) => setR((x) => ({ ...x, experience: x.experience.map((e, j) => (j === i ? { ...e, [k]: v } : e)) }));
  const addEdu = () => setR((x) => ({ ...x, education: [...x.education, { school: "", degree: "", year: "" }] }));
  const addExp = () => setR((x) => ({ ...x, experience: [...x.experience, { company: "", role: "", period: "", details: "" }] }));
  const rmEdu = (i) => setR((x) => ({ ...x, education: x.education.filter((_, j) => j !== i) }));
  const rmExp = (i) => setR((x) => ({ ...x, experience: x.experience.filter((_, j) => j !== i) }));

  const skills = r.skills.split(",").map((s) => s.trim()).filter(Boolean);

  const download = () => {
    const html = printRef.current?.innerHTML || "";
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${r.name || "Resume"} — Resume</title>
      <meta charset="utf-8" />
      <style>
        *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}
        body{padding:40px;color:#1a1a1a;line-height:1.5;}
        h1{font-size:26px;} h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#db254f;border-bottom:2px solid #f0d3da;padding-bottom:4px;margin:18px 0 10px;}
        h3{font-size:15px;} .muted{color:#666;} .title{color:#db254f;font-weight:600;margin-top:2px;} .row{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#555;margin-top:6px;}
        .item{margin-bottom:10px;} .chip{display:inline-block;background:#fce8ee;color:#db254f;border-radius:6px;padding:3px 10px;font-size:12px;margin:0 6px 6px 0;}
        .between{display:flex;justify-content:space-between;gap:12px;} .period{color:#888;font-size:12px;white-space:nowrap;}
        p{font-size:13px;} .sub{color:#666;font-size:13px;}
      </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  const field = "w-full rounded-xl border pf-border px-3.5 py-2.5 text-sm outline-none bg-transparent focus:border-[#db254f] transition";
  const lbl = "block text-xs pf-muted mb-1.5";

  return (
    <StudentShell subtitle="Build Your Resume">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><Sparkles size={20} className="text-[#db254f]" /> Resume Builder</h2>
          <p className="pf-muted">Fill in your details — your resume updates live. Download it as a PDF when ready.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {savedMsg && <span className="text-xs font-medium text-emerald-500 inline-flex items-center gap-1"><Check size={13} /> {savedMsg}</span>}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full border pf-border px-5 py-2.5 text-sm font-semibold pf-hover transition disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="text-[#db254f]" />} {saving ? "Saving…" : "Save Resume"}
          </button>
          <button onClick={download} className="inline-flex items-center gap-2 rounded-full bg-[#db254f] hover:bg-[#b91d40] text-white text-sm font-semibold px-5 py-2.5 shadow-sm shadow-rose-500/30 transition">
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Form ── */}
        <div className="space-y-5">
          <div className="pf-card p-5">
            <h3 className="font-bold mb-4">Personal Details</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Full Name</label><input className={field} value={r.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div><label className={lbl}>Professional Title</label><input className={field} placeholder="e.g. Interior Designer" value={r.title} onChange={(e) => set("title", e.target.value)} /></div>
              <div><label className={lbl}>Email</label><input className={field} value={r.email} onChange={(e) => set("email", e.target.value)} /></div>
              <div><label className={lbl}>Phone</label><input className={field} inputMode="numeric" maxLength={10} value={r.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
              <div><label className={lbl}>Location</label><input className={field} placeholder="City, Country" value={r.location} onChange={(e) => set("location", e.target.value)} /></div>
              <div><label className={lbl}>Website / Portfolio</label><input className={field} placeholder="https://…" value={r.website} onChange={(e) => set("website", e.target.value)} /></div>
            </div>
            <div className="mt-4"><label className={lbl}>Professional Summary</label><textarea rows={3} className={`${field} resize-y`} placeholder="A short intro about yourself…" value={r.summary} onChange={(e) => set("summary", e.target.value)} /></div>
          </div>

          <div className="pf-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><GraduationCap size={17} className="text-[#db254f]" /> Education</h3>
              <button onClick={addEdu} className="inline-flex items-center gap-1 text-sm text-[#db254f] font-medium hover:underline"><Plus size={14} /> Add</button>
            </div>
            <div className="space-y-4">
              {r.education.map((e, i) => (
                <div key={i} className="rounded-xl border pf-border p-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input className={field} placeholder="School / University" value={e.school} onChange={(ev) => setEdu(i, "school", ev.target.value)} />
                    <input className={field} placeholder="Degree / Program" value={e.degree} onChange={(ev) => setEdu(i, "degree", ev.target.value)} />
                  </div>
                  <div className="flex gap-3 mt-3">
                    <input className={field} placeholder="Year (e.g. 2022–2025)" value={e.year} onChange={(ev) => setEdu(i, "year", ev.target.value)} />
                    {r.education.length > 1 && <button onClick={() => rmEdu(i)} className="shrink-0 w-10 rounded-xl border pf-border pf-muted hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pf-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><Briefcase size={17} className="text-[#db254f]" /> Experience</h3>
              <button onClick={addExp} className="inline-flex items-center gap-1 text-sm text-[#db254f] font-medium hover:underline"><Plus size={14} /> Add</button>
            </div>
            <div className="space-y-4">
              {r.experience.map((e, i) => (
                <div key={i} className="rounded-xl border pf-border p-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input className={field} placeholder="Company" value={e.company} onChange={(ev) => setExp(i, "company", ev.target.value)} />
                    <input className={field} placeholder="Role" value={e.role} onChange={(ev) => setExp(i, "role", ev.target.value)} />
                  </div>
                  <input className={`${field} mt-3`} placeholder="Period (e.g. Jan 2024 – Present)" value={e.period} onChange={(ev) => setExp(i, "period", ev.target.value)} />
                  <div className="flex gap-3 mt-3">
                    <textarea rows={2} className={`${field} resize-y`} placeholder="What you did / achievements" value={e.details} onChange={(ev) => setExp(i, "details", ev.target.value)} />
                    {r.experience.length > 1 && <button onClick={() => rmExp(i)} className="shrink-0 w-10 rounded-xl border pf-border pf-muted hover:text-rose-500 flex items-center justify-center"><Trash2 size={15} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pf-card p-5">
            <h3 className="font-bold mb-3">Skills</h3>
            <input className={field} placeholder="Comma separated — e.g. AutoCAD, Sketching, Space Planning" value={r.skills} onChange={(e) => set("skills", e.target.value)} />
          </div>
        </div>

        {/* ── Live preview ── */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border pf-border overflow-hidden shadow-lg">
            <div ref={printRef} className="resume-paper" style={{ minHeight: "60vh" }}>
              <h1>{r.name || "Your Name"}</h1>
              {r.title && <p className="title">{r.title}</p>}
              <div className="row">
                {r.email && <span>✉ {r.email}</span>}
                {r.phone && <span>☎ {r.phone}</span>}
                {r.location && <span>⚲ {r.location}</span>}
                {r.website && <span>🔗 {r.website}</span>}
              </div>

              {r.summary && (<><h2>Summary</h2><p className="sub">{r.summary}</p></>)}

              {r.experience.some((e) => e.company || e.role) && (
                <><h2>Experience</h2>
                  {r.experience.filter((e) => e.company || e.role).map((e, i) => (
                    <div key={i} className="item">
                      <div className="between"><h3>{e.role || "Role"}{e.company ? ` · ${e.company}` : ""}</h3><span className="period">{e.period}</span></div>
                      {e.details && <p className="sub">{e.details}</p>}
                    </div>
                  ))}
                </>
              )}

              {r.education.some((e) => e.school || e.degree) && (
                <><h2>Education</h2>
                  {r.education.filter((e) => e.school || e.degree).map((e, i) => (
                    <div key={i} className="item">
                      <div className="between"><h3>{e.degree || "Degree"}</h3><span className="period">{e.year}</span></div>
                      {e.school && <p className="sub">{e.school}</p>}
                    </div>
                  ))}
                </>
              )}

              {skills.length > 0 && (
                <><h2>Skills</h2><div>{skills.map((s) => <span key={s} className="chip">{s}</span>)}</div></>
              )}
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
