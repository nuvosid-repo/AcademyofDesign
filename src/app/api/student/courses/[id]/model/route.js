import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses, mockEnrollments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/student/courses/:id/model?ci= — the 3D-model embed HTML for one class,
// for an enrolled student. Kept out of the main course payload so it only loads
// when the student actually opens the preview.
export async function GET(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const ci = parseInt(searchParams.get("ci") ?? "-1", 10);

  const useMock = await resolveUseMock();
  const course = useMock
    ? mockCourses().find((c) => ((c._id && c._id.toString()) || c.id) === id)
    : await Course.findById(id).lean().catch(() => null);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cid = (course._id && course._id.toString()) || course.id;

  const enrollments = useMock
    ? mockEnrollments().filter((e) => e.studentId === auth.id)
    : await Enrollment.find({ studentId: auth.id }).lean();
  const enrolled = enrollments.some((e) => e.courseId === cid || (e.courseTitle && e.courseTitle === course.title));
  if (!enrolled) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cls = (course.classes && course.classes.length) ? course.classes[ci] : null;
  const html = (cls?.model3dHtml || "").trim();
  if (!html) return NextResponse.json({ error: "No 3D model for this class" }, { status: 404 });

  return NextResponse.json({
    html,
    className: cls?.name || `Class ${ci + 1}`,
    courseTitle: course.title || "",
  });
}
