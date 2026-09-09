import { NextResponse } from "next/server";
import { resolveUseMock, mockWorkshops } from "@/lib/db";
import { displayDate, displayTime } from "@/lib/workshopFormat";
import Workshop from "@/models/Workshop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Card fields for the public website workshop grid.
const card = (w) => ({
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
});

// GET /api/public/workshops — active workshops for the website.
export async function GET() {
  const useMock = await resolveUseMock();
  if (useMock) {
    const list = mockWorkshops().filter((w) => (w.status || "Active") === "Active");
    return NextResponse.json({ workshops: list.map(card) });
  }
  const docs = await Workshop.find({ status: "Active" }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ workshops: docs.map(card) });
}
