"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Send, Trash2, Heart, CheckCircle2 } from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { apiFetch } from "@/lib/api";
import { cldUrl } from "@/lib/cldImage";

function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

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

function LikeBtn({ liked, likes, onClick, big }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border transition ${big ? "text-sm px-4 py-2" : "text-xs px-3 py-1.5"} ${liked ? "text-[#db254f] border-[#db254f]/40 bg-[#db254f]/10" : "pf-faint pf-border pf-hover"}`}>
      <Heart size={big ? 16 : 14} fill={liked ? "currentColor" : "none"} /> {likes || 0}
    </button>
  );
}

export default function CommunityThreadPage() {
  const { id } = useParams();
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);

  const load = () =>
    apiFetch(`/api/student/community/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setPost(d.post))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

  useEffect(() => { if (id) load(); }, [id]);

  const sendAnswer = async (e) => {
    e.preventDefault();
    if (!answer.trim() || sending) return;
    setSending(true);
    try {
      const res = await apiFetch(`/api/student/community/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: answer }),
      });
      if (res.ok) { const d = await res.json(); setPost(d.post); setAnswer(""); }
    } finally { setSending(false); }
  };

  const delAnswer = async (commentId) => {
    const res = await apiFetch(`/api/student/community/${id}?commentId=${commentId}`, { method: "DELETE" });
    if (res.ok) { const d = await res.json(); setPost(d.post); }
  };
  const delQuestion = async () => {
    const res = await apiFetch(`/api/student/community/${id}`, { method: "DELETE" });
    if (res.ok) router.replace("/student/community");
  };

  const likePost = async () => {
    setPost((p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }));
    try {
      const res = await apiFetch(`/api/student/community/${id}/like`, { method: "POST" });
      if (res.ok) { const d = await res.json(); setPost((p) => ({ ...p, liked: d.liked, likes: d.likes })); }
    } catch { /* keep optimistic */ }
  };
  const likeAnswer = async (cid) => {
    setPost((p) => ({ ...p, comments: p.comments.map((c) => c.id === cid ? { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) } : c) }));
    try {
      const res = await apiFetch(`/api/student/community/${id}/like?commentId=${cid}`, { method: "POST" });
      if (res.ok) { const d = await res.json(); setPost((p) => ({ ...p, comments: p.comments.map((c) => c.id === cid ? { ...c, liked: d.liked, likes: d.likes } : c) })); }
    } catch { /* keep optimistic */ }
  };

  // Answers sorted by likes (most helpful first), then newest.
  const answers = useMemo(() => {
    if (!post?.comments) return [];
    return [...post.comments].sort((a, b) => (b.likes - a.likes) || (new Date(a.createdAt) - new Date(b.createdAt)));
  }, [post]);

  return (
    <StudentShell subtitle="Community">
      <div className="max-w-3xl mx-auto">
        <Link href="/student/community" className="inline-flex items-center gap-1.5 pf-muted hover:text-[#db254f] text-sm mb-4">
          <ArrowLeft size={15} /> Back to Community
        </Link>

        {loading ? (
          <div className="pf-card p-6 animate-pulse h-40" style={{ opacity: 0.5 }} />
        ) : notFound || !post ? (
          <div className="pf-card p-12 text-center">
            <p className="font-bold text-lg">Question not found</p>
            <p className="pf-muted text-sm mt-1">It may have been removed.</p>
          </div>
        ) : (
          <>
            {/* ── Question ── */}
            <div className="pf-card p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-3.5">
                <Avatar name={post.authorName} image={post.authorImage} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{post.authorName}{post.isMine && <span className="pf-faint font-normal"> · You</span>}</p>
                  <p className="pf-faint text-xs">asked {timeAgo(post.createdAt)}</p>
                </div>
                {post.isMine && (
                  <button onClick={delQuestion} title="Delete question"
                    className="pf-faint hover:text-[#db254f] p-2 rounded-lg pf-hover"><Trash2 size={16} /></button>
                )}
              </div>
              <h1 className="font-extrabold text-2xl md:text-3xl leading-snug">{post.title}</h1>
              {post.body && <p className="pf-muted text-sm mt-2.5 leading-relaxed whitespace-pre-wrap">{post.body}</p>}
              <div className="flex items-center gap-2 mt-5 pt-4 border-t pf-border">
                <LikeBtn liked={post.liked} likes={post.likes} onClick={likePost} big />
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full pf-chip">
                  <MessageSquare size={15} className="text-[#db254f]" /> {answers.length} answer{answers.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* ── Answer composer ── */}
            <div className="pf-card p-4 sm:p-5 mt-5">
              <p className="font-bold text-sm mb-2.5 flex items-center gap-2"><Send size={15} className="text-[#db254f]" /> Your answer</p>
              <form onSubmit={sendAnswer}>
                <textarea
                  value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} maxLength={4000}
                  placeholder="Share what you know — help a fellow student…"
                  className="w-full rounded-xl border pf-border bg-transparent px-4 py-3 text-sm outline-none focus:border-[#db254f] resize-y"
                />
                <div className="flex justify-end mt-2.5">
                  <button type="submit" disabled={!answer.trim() || sending}
                    className="inline-flex items-center gap-2 bg-[#db254f] hover:bg-[#b91d40] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition btn-pill">
                    <Send size={15} /> {sending ? "Posting…" : "Post answer"}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Answers ── */}
            <div className="flex items-center gap-2 mt-7 mb-3">
              <MessageSquare size={18} className="text-[#db254f]" />
              <h2 className="font-bold text-lg">{answers.length} Answer{answers.length !== 1 ? "s" : ""}</h2>
            </div>

            {answers.length === 0 ? (
              <div className="pf-card p-8 text-center">
                <MessageSquare size={26} className="text-[#db254f] mx-auto mb-2" />
                <p className="pf-muted text-sm">No answers yet — be the first to help.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {answers.map((c, idx) => (
                  <div key={c.id} className="pf-card p-4 sm:p-5">
                    <div className="flex items-center gap-3 mb-2.5">
                      <Avatar name={c.authorName} image={c.authorImage} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                          {c.authorName}{c.isMine && <span className="pf-faint font-normal"> · You</span>}
                          {idx === 0 && c.likes > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.14)" }}><CheckCircle2 size={10} /> TOP</span>
                          )}
                        </p>
                        <p className="pf-faint text-xs">{timeAgo(c.createdAt)}</p>
                      </div>
                      {c.isMine && (
                        <button onClick={() => delAnswer(c.id)} title="Delete answer"
                          className="pf-faint hover:text-[#db254f] p-1.5 rounded-lg pf-hover"><Trash2 size={15} /></button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.body}</p>
                    <div className="mt-3">
                      <LikeBtn liked={c.liked} likes={c.likes} onClick={() => likeAnswer(c.id)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </StudentShell>
  );
}
