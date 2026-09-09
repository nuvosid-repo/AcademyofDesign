import { NextResponse } from "next/server";
import { resolveUseMock, mockVideos } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Video from "@/models/Video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serialize = (v) => ({
  id: (v._id && v._id.toString()) || v.id,
  title: v.title,
  url: v.url,
  courseId: v.courseId || "",
  course: v.course || "",
  description: v.description || "",
  status: v.status || "Active",
  createdAt: v.createdAt,
});

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ videos: mockVideos().map(serialize) });
  const docs = await Video.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ videos: docs.map(serialize) });
}

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const title = (b.title || "").trim();
  const url = (b.url || "").trim();
  if (!title || !url) return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });
  const doc = {
    title, url,
    courseId: b.courseId || "",
    course: (b.course || "").trim(),
    description: (b.description || "").trim(),
    status: b.status === "Inactive" ? "Inactive" : "Active",
  };

  const useMock = await resolveUseMock();
  if (useMock) {
    const created = { _id: "v_" + Date.now(), ...doc, createdAt: new Date() };
    mockVideos().unshift(created);
    return NextResponse.json({ success: true, video: serialize(created) }, { status: 201 });
  }
  const created = await Video.create(doc);
  return NextResponse.json({ success: true, video: serialize(created) }, { status: 201 });
}
