import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses } from "@/lib/db";
import Course from "@/models/Course";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public course fields shown on the website (no auth required).
const serialize = (c) => ({
  id: (c._id && c._id.toString()) || c.id,
  title: c.title,
  shortDescription: c.shortDescription || c.description || "",
  category: c.category || "",
  duration: c.duration || "",
  level: c.level || "",
  price: c.price || "",
  thumbnail: c.thumbnail || "",
  websiteUrl: c.websiteUrl || "",
  instructor: c.instructor || "",
});

// GET /api/public/courses — active courses for the public website.
// B2B courses are hidden here (they're only for B2B students in the portal).
export async function GET() {
  const useMock = await resolveUseMock();
  if (useMock) {
    const list = mockCourses().filter((c) => (c.status || "Active") === "Active" && (c.subscriptionType || "B2C") !== "B2B");
    return NextResponse.json({ courses: list.map(serialize) });
  }
  const docs = await Course.find({ status: "Active", subscriptionType: { $ne: "B2B" } }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ courses: docs.map(serialize) });
}
