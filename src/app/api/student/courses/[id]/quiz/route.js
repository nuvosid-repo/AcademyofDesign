import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses, mockEnrollments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PASS_MARK = 50; // course quizzes pass at 50%

// POST /api/student/courses/:id/quiz — submit answers for a course quiz.
// Body: { quizIndex, answers: [selectedOptionIndex...] }. Scored server-side and
// recorded so it appears in the student's "My Scores".
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { quizIndex, answers } = await request.json().catch(() => ({}));
  if (quizIndex == null || !Array.isArray(answers)) {
    return NextResponse.json({ error: "quizIndex and answers are required" }, { status: 400 });
  }

  const useMock = await resolveUseMock();
  const course = useMock
    ? mockCourses().find((c) => ((c._id && c._id.toString()) || c.id) === id)
    : await Course.findById(id).lean().catch(() => null);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const cid = (course._id && course._id.toString()) || course.id;

  const enrollments = useMock
    ? mockEnrollments().filter((e) => e.studentId === auth.id)
    : await Enrollment.find({ studentId: auth.id }).lean();
  const enrolled = enrollments.some((e) => e.courseId === cid || (e.courseTitle && e.courseTitle === course.title));
  if (!enrolled) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  const quiz = (course.classes || [])[quizIndex];
  if (!quiz || quiz.type !== "quiz") return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // One attempt only — if already submitted, return the saved score unchanged.
  const aid = `${cid}:${quizIndex}`;
  const prior = useMock
    ? mockAssessmentResults().find((r) => r.studentId === auth.id && r.assessmentId === aid)
    : await AssessmentResult.findOne({ studentId: auth.id, assessmentId: aid }).lean();
  if (prior) {
    return NextResponse.json({ success: true, alreadyAttempted: true, score: prior.score, total: prior.total, percentage: prior.percentage, passed: prior.passed });
  }

  const questions = quiz.questions || [];
  const total = questions.length;
  let score = 0;
  questions.forEach((q, i) => { if (Number(answers[i]) === Number(q.correctIndex)) score++; });
  const percentage = total ? Math.round((score / total) * 100) : 0;
  const passed = percentage >= PASS_MARK;

  const doc = {
    studentId: auth.id, studentName: auth.name || "",
    assessmentId: `${cid}:${quizIndex}`, assessmentTitle: quiz.name || "Quiz", course: course.title || "",
    type: "Quiz", score, total, percentage, passed,
  };
  try {
    if (useMock) {
      mockAssessmentResults().unshift({ _id: "ar_" + Date.now(), ...doc, createdAt: new Date() });
    } else {
      await AssessmentResult.create(doc);
    }
  } catch (e) { console.error("Quiz result save error:", e?.message); }

  return NextResponse.json({ success: true, score, total, percentage, passed });
}
