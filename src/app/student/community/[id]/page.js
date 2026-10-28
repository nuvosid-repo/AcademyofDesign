"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Send, Trash2 } from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { apiFetch } from "@/lib/api";

function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const days = Math.floor(h / 24); if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Avatar({ name, size = 40 }) {
  return (
    <span style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] flex items-center justify-center text-sm font-bold text-white shrink-0">
      {name ? name.charAt(0).toUpperCase() : "U"}
    </span>
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return (
    <StudentShell subtitle="Community">
      <div className="max-w-3xl">
        <Link href="/student/community" className="inline-flex items-center gap-1.5 pf-muted hover:text-[#db254f] text-sm mb-4">
          <ArrowLeft size={15} /> Back to Community
        </Link>

        {loading ? (
          <p className="pf-muted text-sm">Loading…</p>
        ) : notFound || !post ? (
          <div className="pf-card p-10 text-center">
            <p className="font-semibold">Question not found</p>
            <p className="pf-muted text-sm mt-1">It may have been removed.</p>
          </div>
        ) : (
          <>
            {/* Question */}
            <div className="pf-card p-5 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={post.authorName} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{post.authorName}{post.isMine && <span className="pf-faint font-normal"> · You</span>}</p>
                  <p className="pf-faint text-xs">{timeAgo(post.createdAt)}</p>
                </div>
                {post.isMine && (
                  <button onClick={delQuestion} title="Delete question"
                    className="pf-faint hover:text-[#db254f] p-1.5 rounded-lg"><Trash2 size={16} /></button>
                )}
              </div>
              <h2 className="font-bold text-2xl md:text-3xl leading-snug">{post.title}</h2>
              {post.body && <p className="pf-muted text-sm mt-2 leading-relaxed whitespace-pre-wrap">{post.body}</p>}
            </div>

            {/* Answers header */}
            <h3 className="font-bold text-lg mt-7 mb-3 flex items-center gap-2">
              <MessageSquare size={18} className="text-[#db254f]" />
              {post.comments.length} Answer{post.comments.length !== 1 ? "s" : ""}
            </h3>

            {/* Answer composer */}
            <form onSubmit={sendAnswer} className="pf-card p-4 mb-5">
              <textarea
                value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} maxLength={4000}
                placeholder="Write your answer…"
                className="w-full rounded-xl border pf-border bg-transparent px-4 py-3 text-sm outline-none focus:border-[#db254f] resize-y"
              />
              <div className="flex justify-end mt-2.5">
                <button type="submit" disabled={!answer.trim() || sending}
                  className="inline-flex items-center gap-2 bg-[#db254f] hover:bg-[#b91d40] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition btn-pill">
                  <Send size={15} /> {sending ? "Posting…" : "Post answer"}
                </button>
              </div>
            </form>

            {/* Answers list */}
            {post.comments.length === 0 ? (
              <p className="pf-muted text-sm px-1">No answers yet — be the first to help.</p>
            ) : (
              <div className="space-y-3">
                {post.comments.map((c) => (
                  <div key={c.id} className="pf-card p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar name={c.authorName} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{c.authorName}{c.isMine && <span className="pf-faint font-normal"> · You</span>}</p>
                        <p className="pf-faint text-xs">{timeAgo(c.createdAt)}</p>
                      </div>
                      {c.isMine && (
                        <button onClick={() => delAnswer(c.id)} title="Delete answer"
                          className="pf-faint hover:text-[#db254f] p-1.5 rounded-lg"><Trash2 size={15} /></button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap pl-[46px]">{c.body}</p>
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
