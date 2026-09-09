import { NextResponse } from "next/server";
import { resolveUseMock, mockWorkshops } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Workshop from "@/models/Workshop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(w) {
  return {
    id: (w._id && w._id.toString()) || w.id,
    title: w.title,
    subtitle: w.subtitle || "",
    category: w.category || "",
    date: w.date || "",
    startTime: w.startTime || "",
    endTime: w.endTime || "",
    time: w.time || "",
    location: w.location || "",
    price: w.price || "",
    originalPrice: w.originalPrice || "",
    image: w.image || "",
    videoUrl: w.videoUrl || "",
    videoCaption: w.videoCaption || "",
    speaker: w.speaker || {},
    schedule: w.schedule || [],
    keynotes: w.keynotes || [],
    status: w.status || "Active",
    createdAt: w.createdAt,
  };
}

function buildDoc(b) {
  return {
    title: (b.title || "").trim(),
    subtitle: (b.subtitle || "").trim(),
    category: (b.category || "").trim(),
    date: (b.date || "").trim(),
    startTime: (b.startTime || "").trim(),
    endTime: (b.endTime || "").trim(),
    time: (b.time || "").trim(),
    location: (b.location || "").trim(),
    price: (b.price || "").trim(),
    originalPrice: (b.originalPrice || "").trim(),
    image: (b.image || "").trim(),
    videoUrl: (b.videoUrl || "").trim(),
    videoCaption: (b.videoCaption || "").trim(),
    speaker: {
      name: (b.speaker?.name || "").trim(),
      designation: (b.speaker?.designation || "").trim(),
      credentials: (b.speaker?.credentials || "").trim(),
      image: (b.speaker?.image || "").trim(),
      bio: (b.speaker?.bio || "").trim(),
    },
    schedule: Array.isArray(b.schedule)
      ? b.schedule.filter((s) => (s.time || "").trim() || (s.activity || "").trim()).map((s) => ({ time: s.time || "", activity: s.activity || "" }))
      : [],
    keynotes: Array.isArray(b.keynotes) ? b.keynotes.map((k) => (k || "").trim()).filter(Boolean) : [],
    status: b.status === "Inactive" ? "Inactive" : "Active",
  };
}

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ workshops: mockWorkshops().map(serialize) });
  const docs = await Workshop.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ workshops: docs.map(serialize) });
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
    const created = { _id: "wk_" + Date.now(), ...doc, createdAt: new Date() };
    mockWorkshops().unshift(created);
    return NextResponse.json({ success: true, workshop: serialize(created) }, { status: 201 });
  }
  const created = await Workshop.create(doc);
  return NextResponse.json({ success: true, workshop: serialize(created) }, { status: 201 });
}
