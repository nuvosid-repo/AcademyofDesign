import { NextResponse } from "next/server";
import { resolveUseMock, mockInstructors, mockCourses } from "@/lib/db";
import { serializeInstructor } from "@/lib/instructorFields";
import Instructor from "@/models/Instructor";
import Course from "@/models/Course";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/instructors/:id — full mentor detail for the detail page.
// Courses taught by this instructor are derived from the Course collection.
export async function GET(_request, { params }) {
  const { id } = await params;
  const useMock = await resolveUseMock();

  const doc = useMock
    ? mockInstructors().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Instructor.findById(id).lean().catch(() => null);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const m = serializeInstructor(doc);
  const name = (m.name || "").toLowerCase();

  // Courses that list this instructor (by name).
  const courseDocs = useMock
    ? mockCourses()
    : await Course.find({ status: "Active" }).select("title instructor instructors").lean();
  const courses = courseDocs
    .filter((c) => {
      const list = (c.instructors || []).map((n) => (n || "").toLowerCase());
      return list.includes(name) || (c.instructor || "").toLowerCase() === name;
    })
    .map((c) => ({ id: (c._id && c._id.toString()) || c.id, title: c.title }));

  const image = !m.image ? "" : (m.image.startsWith("data:") ? `/api/public/instructors/${m.id}/image/` : m.image);
  return NextResponse.json({
    instructor: { ...m, slug: m.id, image, img: image, courses },
  });
}
