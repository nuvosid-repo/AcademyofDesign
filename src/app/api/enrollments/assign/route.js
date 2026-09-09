import { NextResponse } from "next/server";
import { resolveUseMock, mockEnrollments, mockStudents, mockCourses } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
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

// POST /api/enrollments/assign — admin assigns a course to a student.
export async function POST(request) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { studentId, courseId } = await request.json().catch(() => ({}));
  if (!studentId || !courseId) return NextResponse.json({ error: "studentId and courseId are required" }, { status: 400 });

  const useMock = await resolveUseMock();
  const student = useMock
    ? mockStudents().find((s) => ((s._id && s._id.toString()) || s.id) === studentId)
    : await Student.findById(studentId).lean().catch(() => null);
  const course = useMock
    ? mockCourses().find((c) => ((c._id && c._id.toString()) || c.id) === courseId)
    : await Course.findById(courseId).lean().catch(() => null);
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const cid = (course._id && course._id.toString()) || course.id;
  const doc = {
    courseId: cid,
    courseTitle: course.title || "",
    studentId,
    studentName: student.name || "",
    studentEmail: student.email || "",
    amount: 0,
    paymentId: "admin_assigned",
  };

  if (useMock) {
    const store = mockEnrollments();
    if (store.some((e) => e.studentId === studentId && (e.courseId === cid || e.courseTitle === course.title))) {
      return NextResponse.json({ error: "Student is already enrolled in this course" }, { status: 400 });
    }
    store.unshift({ _id: "en_" + Date.now(), ...doc, createdAt: new Date() });
    return NextResponse.json({ success: true });
  }

  const existing = await Enrollment.findOne({ studentId, $or: [{ courseId: cid }, { courseTitle: course.title }] }).lean();
  if (existing) return NextResponse.json({ error: "Student is already enrolled in this course" }, { status: 400 });
  await Enrollment.create(doc);
  return NextResponse.json({ success: true });
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
