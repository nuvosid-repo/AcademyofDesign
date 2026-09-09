import { NextResponse } from "next/server";
import { resolveUseMock, mockLiveClasses } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import LiveClass from "@/models/LiveClass";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(l) {
  return {
    id: (l._id && l._id.toString()) || l.id,
    title: l.title,
    date: l.date || "",
    time: l.time || "",
    type: l.type || "Live Class",
    description: l.description || "",
    link: l.link || "",
    course: l.course || "",
    status: l.status || "Active",
    createdAt: l.createdAt,
  };
}

function buildDoc(b) {
  return {
    title: (b.title || "").trim(),
    date: (b.date || "").trim(),
    time: (b.time || "").trim(),
    type: b.type === "Quiz" ? "Quiz" : "Live Class",
    description: (b.description || "").trim(),
    link: (b.link || "").trim(),
    course: (b.course || "").trim(),
    status: b.status === "Inactive" ? "Inactive" : "Active",
  };
}

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ liveClasses: mockLiveClasses().map(serialize) });

  const docs = await LiveClass.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ liveClasses: docs.map(serialize) });
}

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const doc = buildDoc(b);
  if (!doc.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const useMock = await resolveUseMock();
  if (useMock) {
    const created = { _id: "lc_" + Date.now(), ...doc, createdAt: new Date() };
    mockLiveClasses().unshift(created);
    return NextResponse.json({ success: true, liveClass: serialize(created) }, { status: 201 });
  }

  const created = await LiveClass.create(doc);
  return NextResponse.json({ success: true, liveClass: serialize(created) }, { status: 201 });
}
