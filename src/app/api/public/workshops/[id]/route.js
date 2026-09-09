import { NextResponse } from "next/server";
import { resolveUseMock, mockWorkshops } from "@/lib/db";
import { displayDate, displayTime } from "@/lib/workshopFormat";
import Workshop from "@/models/Workshop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const full = (w) => ({
  id: (w._id && w._id.toString()) || w.id,
  title: w.title,
  subtitle: w.subtitle || "",
  category: w.category || "",
  date: displayDate(w.date),
  time: displayTime(w.startTime, w.endTime, w.time),
  location: w.location || "",
  price: w.price || "",
  originalPrice: w.originalPrice || "",
  image: w.image || "",
  videoUrl: w.videoUrl || "",
  videoCaption: w.videoCaption || "",
  speaker: w.speaker || {},
  schedule: w.schedule || [],
  keynotes: w.keynotes || [],
});

// GET /api/public/workshops/:id — single workshop for the detail page.
export async function GET(_request, { params }) {
  const { id } = await params;
  const useMock = await resolveUseMock();
  if (useMock) {
    const w = mockWorkshops().find((x) => x._id === id);
    if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ workshop: full(w) });
  }
  const w = await Workshop.findById(id).lean().catch(() => null);
  if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ workshop: full(w) });
}
