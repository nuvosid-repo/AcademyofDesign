import { NextResponse } from "next/server";
import { resolveUseMock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import CommunityPost from "@/models/CommunityPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mockStore() {
  if (!globalThis.__mockCommunity) globalThis.__mockCommunity = [];
  return globalThis.__mockCommunity;
}
const pid = (p) => (p._id && p._id.toString()) || p.id;

// Toggle this student's like on a question, or on one answer (?commentId=…).
// Returns the fresh like count + whether the student now likes it.
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const commentId = new URL(request.url).searchParams.get("commentId");

  const toggle = (arr) => {
    const i = arr.indexOf(auth.id);
    if (i >= 0) { arr.splice(i, 1); return false; }
    arr.push(auth.id); return true;
  };

  const useMock = await resolveUseMock();
  if (useMock) {
    const post = mockStore().find((p) => pid(p) === id);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (commentId) {
      const c = post.comments.find((x) => ((x._id && x._id.toString()) || x.id) === commentId);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
      c.likedBy = c.likedBy || [];
      const liked = toggle(c.likedBy);
      return NextResponse.json({ likes: c.likedBy.length, liked });
    }
    post.likedBy = post.likedBy || [];
    const liked = toggle(post.likedBy);
    return NextResponse.json({ likes: post.likedBy.length, liked });
  }

  const post = await CommunityPost.findById(id).catch(() => null);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (commentId) {
    const c = post.comments.id(commentId);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    c.likedBy = c.likedBy || [];
    const liked = toggle(c.likedBy);
    await post.save();
    return NextResponse.json({ likes: c.likedBy.length, liked });
  }
  post.likedBy = post.likedBy || [];
  const liked = toggle(post.likedBy);
  await post.save();
  return NextResponse.json({ likes: post.likedBy.length, liked });
}
