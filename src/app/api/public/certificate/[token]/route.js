import { NextResponse } from "next/server";
import { resolveUseMock, mockStudents, mockEnrollments, mockCourses } from "@/lib/db";
import { isCourseCompleted } from "@/lib/courseProgress";
import Student from "@/models/Student";
import Enrollment from "@/models/Enrollment";
import Course from "@/models/Course";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/certificate/:token — token is `${studentId}__${courseId}`.
// Returns the certificate data only if the student actually completed the course.
export async function GET(request, { params }) {
  const { token } = await params;
  const [studentId, courseId] = (token || "").split("__");
  if (!studentId || !courseId) return NextResponse.json({ eligible: false, error: "Invalid certificate" }, { status: 400 });

  const useMock = await resolveUseMock();
  const [student, course] = useMock
    ? [mockStudents().find((s) => ((s._id && s._id.toString()) || s.id) === studentId), mockCourses().find((c) => ((c._id && c._id.toString()) || c.id) === courseId)]
    : await Promise.all([
        Student.findById(studentId).select("name").lean().catch(() => null),
        Course.findById(courseId).select("title classes videos").lean().catch(() => null),
      ]);
  if (!student || !course) return NextResponse.json({ eligible: false, error: "Not found" }, { status: 404 });

  const enrollment = useMock
    ? mockEnrollments().find((e) => e.studentId === studentId && (e.courseId === courseId || e.courseTitle === course.title))
    : await Enrollment.findOne({ studentId, $or: [{ courseId }, { courseTitle: course.title }] }).lean().catch(() => null);

  if (!enrollment || !isCourseCompleted(enrollment, course)) {
    return NextResponse.json({ eligible: false, error: "This course is not completed yet." }, { status: 200 });
  }

  const issued = enrollment.updatedAt || enrollment.createdAt || new Date();
  return NextResponse.json({
    eligible: true,
    studentName: student.name || "",
    courseTitle: course.title || "",
    issuedDate: issued,
  });
}
