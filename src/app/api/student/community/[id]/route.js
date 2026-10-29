import { NextResponse } from "next/server";
import { resolveUseMock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import CommunityPost from "@/models/CommunityPost";
import { authorImages } from "@/lib/communityAuthors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mockStore() {
  if (!globalThis.__mockCommunity) globalThis.__mockCommunity = [];
  return globalThis.__mockCommunity;
}
const pid = (p) => (p._id && p._id.toString()) || p.id;

// Shape a full thread (question + its answers) for the detail page.
const toThread = (p, meId) => ({
  id: pid(p),
  title: p.title,
  body: p.body,
  authorName: p.authorName,
  authorId: p.authorId,
  isMine: !!meId && p.authorId === meId,
  likes: (p.likedBy || []).length,
  liked: !!meId && (p.likedBy || []).includes(meId),
  createdAt: p.createdAt,
  comments: (p.comments || []).map((c) => ({
    id: (c._id && c._id.toString()) || c.id,
    authorName: c.authorName,
    authorId: c.authorId,
    isMine: !!meId && c.authorId === meId,
    body: c.body,
    likes: (c.likedBy || []).length,
    liked: !!meId && (c.likedBy || []).includes(meId),
    createdAt: c.createdAt,
  })),
});

// Attach each author's current profile image (question + every answer).
async function withImages(thread, useMock) {
  const imgs = await authorImages([thread.authorId, ...thread.comments.map((c) => c.authorId)], useMock);
  thread.authorImage = imgs[thread.authorId] || "";
  thread.comments.forEach((c) => { c.authorImage = imgs[c.authorId] || ""; });
  return thread;
}

// GET — one question with all its answers.
export async function GET(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const useMock = await resolveUseMock();
  const post = useMock
    ? mockStore().find((p) => pid(p) === id)
    : await CommunityPost.findById(id).lean().catch(() => null);
  if (!post) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  return NextResponse.json({ post: await withImages(toThread(post, auth.id), useMock) });
}

// POST — add an answer (comment) to a question.
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = ((await request.json().catch(() => ({})))?.body || "").trim();
  if (!body) return NextResponse.json({ error: "Please write an answer." }, { status: 400 });

  const useMock = await resolveUseMock();
  if (useMock) {
    const post = mockStore().find((p) => pid(p) === id);
    if (!post) return NextResponse.json({ error: "Question not found" }, { status: 404 });
    post.comments.push({
      _id: "mc_" + Date.now() + Math.random().toString(36).slice(2, 6),
      authorId: auth.id, authorName: auth.name || "Student", body, likedBy: [], createdAt: new Date(),
    });
    return NextResponse.json({ post: await withImages(toThread(post, auth.id), useMock) }, { status: 201 });
  }

  const post = await CommunityPost.findById(id).catch(() => null);
  if (!post) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  post.comments.push({ authorId: auth.id, authorName: auth.name || "Student", body });
  await post.save();
  return NextResponse.json({ post: await withImages(toThread(post.toObject(), auth.id), useMock) }, { status: 201 });
}

// DELETE — remove your own answer (?commentId=…) or your own question.
export async function DELETE(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const commentId = new URL(request.url).searchParams.get("commentId");

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockStore();
    const post = store.find((p) => pid(p) === id);
    if (!post) return NextResponse.json({ error: "Question not found" }, { status: 404 });
    if (commentId) {
      const c = post.comments.find((x) => ((x._id && x._id.toString()) || x.id) === commentId);
      if (!c) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
      if (c.authorId !== auth.id) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
      post.comments = post.comments.filter((x) => x !== c);
      return NextResponse.json({ post: await withImages(toThread(post, auth.id), useMock) });
    }
    if (post.authorId !== auth.id) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const i = store.indexOf(post);
    if (i >= 0) store.splice(i, 1);
    return NextResponse.json({ ok: true });
  }

  const post = await CommunityPost.findById(id).catch(() => null);
  if (!post) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  if (commentId) {
    const c = post.comments.id(commentId);
    if (!c) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    if (c.authorId !== auth.id) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    c.deleteOne();
    await post.save();
    return NextResponse.json({ post: await withImages(toThread(post.toObject(), auth.id), useMock) });
  }
  if (post.authorId !== auth.id) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await post.deleteOne();
  return NextResponse.json({ ok: true });
}
