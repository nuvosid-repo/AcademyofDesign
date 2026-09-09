import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses } from "@/lib/db";
import Course from "@/models/Course";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public detail fields for a single course (no videos/materials — those are
// student-panel only).
const serialize = (c) => ({
  id: (c._id && c._id.toString()) || c.id,
  title: c.title,
  shortDescription: c.shortDescription || c.description || "",
  overview: c.overview || "",
  category: c.category || "",
  duration: c.duration || "",
  level: c.level || "",
  price: c.price || "",
  lessons: c.lessons || "",
  instructor: c.instructor || "",
  thumbnail: c.thumbnail || "",
  banner: c.banner || "",
  introVideo: c.introVideo || "",
  demoVideo: c.demoVideo || "",
  status: c.status || "Active",
});

// GET /api/public/courses/:id — single course for the public detail page.
export async function GET(_request, { params }) {
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const c = mockCourses().find((x) => x._id === id);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ course: serialize(c) });
  }
  const c = await Course.findById(id).lean().catch(() => null);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ course: serialize(c) });
}
