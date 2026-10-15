import { NextResponse } from "next/server";
import { resolveUseMock, mockEnrollments, mockStudents, mockCourses } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { courseEndExpiry } from "@/lib/enrollment";
import Enrollment from "@/models/Enrollment";
import Student from "@/models/Student";
import Course from "@/models/Course";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request) {
  const auth = await getAuthUser(request);
  if (!auth) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (auth.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { auth };
}

// POST /api/enrollments/assign — admin assigns a course to one student
// ({ studentId, courseId }) or many at once ({ studentIds: [...], courseId }).
export async function POST(request) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const { courseId } = body;
  const ids = Array.isArray(body.studentIds) ? body.studentIds.filter(Boolean) : (body.studentId ? [body.studentId] : []);
  const bulk = Array.isArray(body.studentIds);
  if (!ids.length || !courseId) return NextResponse.json({ error: "studentId(s) and courseId are required" }, { status: 400 });

  const useMock = await resolveUseMock();
  const course = useMock
    ? mockCourses().find((c) => ((c._id && c._id.toString()) || c.id) === courseId)
    : await Course.findById(courseId).lean().catch(() => null);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const cid = (course._id && course._id.toString()) || course.id;

  let assigned = 0, skipped = 0, notFound = 0;
  const store = useMock ? mockEnrollments() : null;

  for (const studentId of ids) {
    const student = useMock
      ? mockStudents().find((s) => ((s._id && s._id.toString()) || s.id) === studentId)
      : await Student.findById(studentId).lean().catch(() => null);
    if (!student) { notFound++; continue; }

    const already = useMock
      ? store.some((e) => e.studentId === studentId && (e.courseId === cid || e.courseTitle === course.title))
      : await Enrollment.findOne({ studentId, $or: [{ courseId: cid }, { courseTitle: course.title }] }).lean();
    if (already) { skipped++; continue; }

    const doc = {
      courseId: cid, courseTitle: course.title || "",
      studentId, studentName: student.name || "", studentEmail: student.email || "",
      amount: 0, paymentId: "admin_assigned", expiresAt: courseEndExpiry(course),
    };
    if (useMock) store.unshift({ _id: "en_" + Date.now() + "_" + studentId, ...doc, createdAt: new Date() });
    else await Enrollment.create(doc);
    assigned++;
  }

  // Single-assign keeps its original error-on-duplicate behaviour.
  if (!bulk && skipped) return NextResponse.json({ error: "Student is already enrolled in this course" }, { status: 400 });
  return NextResponse.json({ success: true, assigned, skipped, notFound, total: ids.length });
}

// DELETE /api/enrollments/assign?studentId=&courseId= — admin removes an assignment.
export async function DELETE(request) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const courseId = searchParams.get("courseId");
  const courseTitle = searchParams.get("courseTitle");
  if (!studentId || (!courseId && !courseTitle)) return NextResponse.json({ error: "studentId and course are required" }, { status: 400 });

  const or = [];
  if (courseId) or.push({ courseId });
  if (courseTitle) or.push({ courseTitle });

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockEnrollments();
    for (let i = store.length - 1; i >= 0; i--) {
      const e = store[i];
      if (e.studentId === studentId && (e.courseId === courseId || e.courseTitle === courseTitle)) store.splice(i, 1);
    }
    return NextResponse.json({ success: true });
  }
  await Enrollment.deleteMany({ studentId, $or: or });
  return NextResponse.json({ success: true });
}
