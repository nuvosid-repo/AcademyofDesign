"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, MessagesSquare, Send, Plus, X } from "lucide-react";
import StudentShell from "@/components/portal/StudentShell";
import { apiFetch } from "@/lib/api";

// "2 hours ago" style relative time.
function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const days = Math.floor(h / 24); if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Avatar({ name }) {
  return (
    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#db254f] to-[#e56b85] flex items-center justify-center text-sm font-bold text-white shrink-0">
      {name ? name.charAt(0).toUpperCase() : "U"}
    </span>
  );
}

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (res.ok) {
        const d = await res.json();
        setPosts((p) => [d.post, ...p]);
        setTitle(""); setBody(""); setOpen(false);
      }
    } finally { setPosting(false); }
  };

  return (
    <StudentShell subtitle="Community">
      <div className="max-w-3xl">
        {/* Heading */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
              <MessagesSquare className="text-[#db254f]" size={26} /> Community
            </h2>
            <p className="pf-muted text-sm">Ask a question and get answers from fellow students. Help others by answering too.</p>
          </div>
          {!open && (
            <button onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 bg-[#db254f] hover:bg-[#b91d40] text-white font-semibold text-sm px-4 py-2.5 rounded-full shrink-0 transition btn-pill">
              <Plus size={16} /> Ask
            </button>
          )}
        </div>

        {/* Ask composer */}
        {open && (
          <form onSubmit={submit} className="pf-card p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Ask a question</h3>
              <button type="button" onClick={() => setOpen(false)} className="pf-muted hover:text-[#db254f]" aria-label="Close"><X size={18} /></button>
            </div>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={160}
              placeholder="Your question (e.g. How is development length calculated for RCC beams?)"
              className="w-full rounded-xl border pf-border bg-transparent px-4 py-3 text-sm outline-none focus:border-[#db254f] mb-3"
            />
            <textarea
              value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={4000}
              placeholder="Add more details (optional)…"
              className="w-full rounded-xl border pf-border bg-transparent px-4 py-3 text-sm outline-none focus:border-[#db254f] resize-y"
            />
            <div className="flex justify-end mt-3">
              <button type="submit" disabled={!title.trim() || posting}
                className="inline-flex items-center gap-2 bg-[#db254f] hover:bg-[#b91d40] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition btn-pill">
                <Send size={15} /> {posting ? "Posting…" : "Post question"}
              </button>
            </div>
          </form>
        )}

        {/* Feed */}
        {loading ? (
          <p className="pf-muted text-sm">Loading…</p>
        ) : posts.length === 0 ? (
          <div className="pf-card p-10 text-center">
            <MessageSquare size={34} className="text-[#db254f] mx-auto mb-3" />
            <p className="font-semibold">No questions yet</p>
            <p className="pf-muted text-sm mt-1">Be the first to ask the community a question.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <Link key={p.id} href={`/student/community/${p.id}`}
                className="pf-card p-5 block hover:border-[#db254f]/40 transition">
                <div className="flex items-center gap-3 mb-2.5">
                  <Avatar name={p.authorName} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.authorName}{p.isMine && <span className="pf-faint font-normal"> · You</span>}</p>
                    <p className="pf-faint text-xs">{timeAgo(p.createdAt)}</p>
                  </div>
                </div>
                <h3 className="font-bold text-xl md:text-2xl leading-snug">{p.title}</h3>
                {p.body && <p className="pf-muted text-sm mt-1.5 line-clamp-2">{p.body}</p>}
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium pf-faint">
                  <MessageSquare size={14} className="text-[#db254f]" />
                  {p.answers} answer{p.answers !== 1 ? "s" : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
