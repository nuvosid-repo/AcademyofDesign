import { NextResponse } from "next/server";
import { resolveUseMock, mockWorkshops } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Workshop from "@/models/Workshop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function requireAdmin(request) {
  const auth = await getAuthUser(request);
  if (!auth) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (auth.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { auth };
}

export async function PUT(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  const patch = buildDoc(b);
  if (!patch.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const useMock = await resolveUseMock();
  if (useMock) {
    const w = mockWorkshops().find((x) => x._id === id);
    if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });
    Object.assign(w, patch);
    return NextResponse.json({ success: true });
  }
  await Workshop.findByIdAndUpdate(id, patch);
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockWorkshops();
    const idx = store.findIndex((x) => x._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }
  await Workshop.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
