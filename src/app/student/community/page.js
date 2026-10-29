"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, MessagesSquare, Send, Plus, X, Search, Heart,
  Flame, Clock3, HelpCircle, Sparkles,
} from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { apiFetch } from "@/lib/api";
import { cldUrl } from "@/lib/cldImage";

/* ── helpers ── */
function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// Deterministic gradient per name so avatars are colourful but stable.
const AV = [
  ["#db254f", "#e56b85"], ["#6366f1", "#8b8ff5"], ["#0ea5e9", "#38bdf8"],
  ["#10b981", "#34d399"], ["#f59e0b", "#fbbf24"], ["#8b5cf6", "#a78bfa"],
  ["#ec4899", "#f472b6"], ["#14b8a6", "#2dd4bf"],
];
const avFor = (name) => {
  let h = 0; for (let i = 0; i < (name || "U").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV[h % AV.length];
};
function Avatar({ name, image, size = 44 }) {
  const [err, setErr] = useState(false);
  const [a, b] = avFor(name);
  if (image && !err) {
    return (
      <img src={cldUrl(image, { width: Math.round(size * 2) })} alt={name || "User"} onError={() => setErr(true)}
        style={{ width: size, height: size }} loading="lazy" decoding="async"
        className="rounded-full object-cover shrink-0 shadow-sm bg-black/10" />
    );
  }
  return (
    <span style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${b})`, fontSize: size * 0.4 }}
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm">
      {name ? name.charAt(0).toUpperCase() : "U"}
    </span>
  );
}

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("latest"); // latest | unanswered | top

  const load = () =>
    apiFetch("/api/student/community", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || posting) return;
    setPosting(true);
    try {
      const res = await apiFetch("/api/student/community", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (res.ok) {
        const d = await res.json();
        setPosts((p) => [d.post, ...p]);
        setTitle(""); setBody(""); setOpen(false);
      }
    } finally { setPosting(false); }
  };

  const toggleLike = async (e, post) => {
    e.stopPropagation();
    // optimistic
    setPosts((list) => list.map((p) => p.id === post.id
      ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
    try {
      const res = await apiFetch(`/api/student/community/${post.id}/like`, { method: "POST" });
      if (res.ok) { const d = await res.json(); setPosts((list) => list.map((p) => p.id === post.id ? { ...p, liked: d.liked, likes: d.likes } : p)); }
    } catch { /* keep optimistic */ }
  };

  const shown = useMemo(() => {
    let list = posts;
    const t = q.trim().toLowerCase();
    if (t) list = list.filter((p) => (p.title + " " + (p.body || "") + " " + p.authorName).toLowerCase().includes(t));
    list = [...list];
    if (sort === "top") list.sort((a, b) => (b.likes - a.likes) || (b.answers - a.answers));
    else if (sort === "unanswered") list = list.filter((p) => p.answers === 0).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [posts, q, sort]);

  const totalAnswers = posts.reduce((n, p) => n + p.answers, 0);

  const SortBtn = ({ id, icon: Icon, label }) => (
    <button onClick={() => setSort(id)}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition ${sort === id ? "bg-[#db254f] text-white shadow-sm shadow-rose-500/30" : "pf-chip pf-hover"}`}>
      <Icon size={15} /> {label}
    </button>
  );

  return (
    <StudentShell subtitle="Community">
      <div className="max-w-3xl mx-auto">
        {/* ── Hero header ── */}
        <div className="pf-card overflow-hidden mb-5">
          <div className="p-5 sm:p-6 relative" style={{ background: "linear-gradient(135deg, rgba(219,37,79,0.12), rgba(99,102,241,0.10))" }}>
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-500/30" style={{ background: "linear-gradient(135deg,#db254f,#e56b85)" }}>
                <MessagesSquare size={24} />
              </span>
              <div className="min-w-0">
                <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">Community</h2>
                <p className="pf-muted text-sm mt-0.5">Ask questions, share answers, learn together.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 pf-muted"><HelpCircle size={14} className="text-[#db254f]" /> {posts.length} question{posts.length !== 1 ? "s" : ""}</span>
              <span className="inline-flex items-center gap-1.5 pf-muted"><MessageSquare size={14} className="text-[#db254f]" /> {totalAnswers} answer{totalAnswers !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* ── Composer ── */}
        <div className="pf-card p-4 sm:p-5 mb-5">
          {!open ? (
            <button onClick={() => setOpen(true)} className="w-full flex items-center gap-3 text-left">
              <Avatar name="You" size={40} />
              <span className="flex-1 rounded-full border pf-border px-4 py-2.5 text-sm pf-faint pf-hover transition">Ask the community a question…</span>
              <span className="inline-flex items-center gap-1.5 bg-[#db254f] hover:bg-[#b91d40] text-white font-semibold text-sm px-4 py-2.5 rounded-full shrink-0 transition btn-pill"><Plus size={16} /> Ask</span>
            </button>
          ) : (
            <form onSubmit={submit}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles size={18} className="text-[#db254f]" /> Ask a question</h3>
                <button type="button" onClick={() => setOpen(false)} className="pf-muted hover:text-[#db254f]" aria-label="Close"><X size={18} /></button>
              </div>
              <input
                value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={160}
                placeholder="What's your question? Be specific."
                className="w-full rounded-xl border pf-border bg-transparent px-4 py-3 text-sm font-medium outline-none focus:border-[#db254f] mb-3"
              />
              <textarea
                value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={4000}
                placeholder="Add details that help others answer (optional)…"
                className="w-full rounded-xl border pf-border bg-transparent px-4 py-3 text-sm outline-none focus:border-[#db254f] resize-y"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs pf-faint">{title.length}/160</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold pf-muted px-3 py-2 rounded-full pf-hover">Cancel</button>
                  <button type="submit" disabled={!title.trim() || posting}
                    className="inline-flex items-center gap-2 bg-[#db254f] hover:bg-[#b91d40] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition btn-pill">
                    <Send size={15} /> {posting ? "Posting…" : "Post question"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ── Toolbar: search + sort ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pf-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions…"
              className="w-full rounded-full border pf-border bg-transparent pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#db254f]" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <SortBtn id="latest" icon={Clock3} label="Latest" />
            <SortBtn id="unanswered" icon={HelpCircle} label="Unanswered" />
            <SortBtn id="top" icon={Flame} label="Top" />
          </div>
        </div>

        {/* ── Feed ── */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="pf-card p-5 animate-pulse h-28" style={{ opacity: 0.5 }} />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="pf-card p-12 text-center">
            <span className="w-16 h-16 rounded-2xl pf-chip flex items-center justify-center mx-auto mb-4"><MessageSquare size={30} className="text-[#db254f]" /></span>
            <p className="font-bold text-lg">{q || sort === "unanswered" ? "Nothing here" : "No questions yet"}</p>
            <p className="pf-muted text-sm mt-1">{q ? "Try a different search." : sort === "unanswered" ? "Every question has an answer 🎉" : "Be the first to ask the community a question."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((p) => (
              <article key={p.id} onClick={() => router.push(`/student/community/${p.id}`)}
                className="pf-card p-5 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg hover:border-[#db254f]/40"
                style={{ transitionProperty: "transform, box-shadow, border-color" }}>
                <div className="flex items-center gap-3 mb-2.5">
                  <Avatar name={p.authorName} image={p.authorImage} size={40} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.authorName}{p.isMine && <span className="pf-faint font-normal"> · You</span>}</p>
                    <p className="pf-faint text-xs">{timeAgo(p.createdAt)}</p>
                  </div>
                </div>
                <h3 className="font-bold text-xl md:text-2xl leading-snug">{p.title}</h3>
                {p.body && <p className="pf-muted text-sm mt-1.5 line-clamp-2 leading-relaxed">{p.body}</p>}
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={(e) => toggleLike(e, p)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${p.liked ? "text-[#db254f] border-[#db254f]/40 bg-[#db254f]/10" : "pf-faint pf-border pf-hover"}`}>
                    <Heart size={14} fill={p.liked ? "currentColor" : "none"} /> {p.likes || 0}
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full pf-chip">
                    <MessageSquare size={14} className="text-[#db254f]" /> {p.answers} answer{p.answers !== 1 ? "s" : ""}
                  </span>
                  {p.answers === 0 && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-amber-600" style={{ background: "rgba(245,158,11,0.12)" }}>Unanswered</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </StudentShell>
  );
}
