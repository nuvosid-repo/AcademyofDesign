import { NextResponse } from "next/server";
import { resolveUseMock, mockEnrollments, mockAssessments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Enrollment from "@/models/Enrollment";
import Assessment from "@/models/Assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/student/assessments — assessments for the student's enrolled courses.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();
  const [enrollments, all] = useMock
    ? [mockEnrollments().filter((e) => e.studentId === auth.id), mockAssessments()]
    : await Promise.all([
        Enrollment.find({ studentId: auth.id }).lean(),
        Assessment.find().lean(),
      ]);

  const titles = new Set(enrollments.map((e) => e.courseTitle).filter(Boolean));

  const assessments = all
    .filter((a) => (a.status || "Active") !== "Inactive" && a.course && titles.has(a.course))
    .map((a) => ({
      id: (a._id && a._id.toString()) || a.id,
      title: a.title,
      course: a.course || "",
      type: a.type || "MCQ",
      description: a.description || "",
      questionCount: (a.questions || []).length,
      passingScore: a.passingScore || 0,
      interviewDate: a.interviewDate || "",
      interviewTime: a.interviewTime || "",
      interviewLink: a.interviewLink || "",
      interviewer: a.interviewer || "",
    }));

  return NextResponse.json({ assessments });
}
