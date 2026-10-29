import { NextResponse } from "next/server";
import { resolveUseMock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import CommunityPost from "@/models/CommunityPost";
import { authorImages } from "@/lib/communityAuthors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dev-only in-memory fallback so the community works without a real DB.
function mockStore() {
  if (!globalThis.__mockCommunity) globalThis.__mockCommunity = [];
  return globalThis.__mockCommunity;
}

// Shape a post for the feed: metadata + answer count, no comment bodies.
const toCard = (p, meId) => ({
  id: (p._id && p._id.toString()) || p.id,
  title: p.title,
  body: p.body,
  authorName: p.authorName,
  authorId: p.authorId,
  isMine: !!meId && p.authorId === meId,
  answers: (p.comments || []).length,
  likes: (p.likedBy || []).length,
  liked: !!meId && (p.likedBy || []).includes(meId),
  createdAt: p.createdAt,
});

// GET — the question feed, newest first.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();
  const posts = useMock
    ? [...mockStore()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : await CommunityPost.find({}).sort({ createdAt: -1 }).limit(200).lean();

  const cards = posts.map((p) => toCard(p, auth.id));
  // Attach each author's current profile image (looked up live).
  const imgs = await authorImages(cards.map((c) => c.authorId), useMock);
  cards.forEach((c) => { c.authorImage = imgs[c.authorId] || ""; });
  return NextResponse.json({ posts: cards });
}

// POST — ask a question.
export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, body } = await request.json().catch(() => ({}));
  const t = (title || "").trim();
  const b = (body || "").trim();
  if (!t) return NextResponse.json({ error: "Please add a question title." }, { status: 400 });

  const useMock = await resolveUseMock();
  if (useMock) {
    const post = {
      _id: "mock_" + Date.now() + Math.random().toString(36).slice(2, 8),
      authorId: auth.id, authorName: auth.name || "Student",
      title: t, body: b, likedBy: [], comments: [], createdAt: new Date(),
    };
    mockStore().unshift(post);
    return NextResponse.json({ post: toCard(post, auth.id) }, { status: 201 });
  }

  const post = await CommunityPost.create({
    authorId: auth.id, authorName: auth.name || "Student", title: t, body: b,
  });
  return NextResponse.json({ post: toCard(post, auth.id) }, { status: 201 });
}
