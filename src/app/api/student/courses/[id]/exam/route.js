import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses, mockEnrollments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { isAIConfigured, gradeWrittenAnswers } from "@/lib/ai";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PASS_MARK = 50; // course written/interview pass at 50% (combined of its marks)

// POST /api/student/courses/:id/exam — submit a course WRITTEN exam or AI
// INTERVIEW item. Body: { itemIndex, answers: [text/transcript...] }. Answers
// are AI-graded against the item's questions and the result is saved so it
// shows in the student's dashboard scores. One attempt only.
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { itemIndex, answers } = await request.json().catch(() => ({}));
  if (itemIndex == null || !Array.isArray(answers)) {
    return NextResponse.json({ error: "itemIndex and answers are required" }, { status: 400 });
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

  const item = (course.classes || [])[itemIndex];
  if (!item || (item.type !== "written" && item.type !== "interview")) {
    return NextResponse.json({ error: "Exam item not found" }, { status: 404 });
  }
  const kind = item.type === "interview" ? "Interview" : "Written";

  // One attempt only — return the saved score if already attempted.
  const aid = `${cid}:${itemIndex}`;
  const prior = useMock
    ? mockAssessmentResults().find((r) => r.studentId === auth.id && r.assessmentId === aid)
    : await AssessmentResult.findOne({ studentId: auth.id, assessmentId: aid }).lean();
  if (prior) {
    return NextResponse.json({
      success: true, alreadyAttempted: true, kind,
      score: prior.score, total: prior.total, percentage: prior.percentage, passed: prior.passed,
      breakdown: prior.breakdown || [],
    });
  }

  const questions = (item.markedQuestions || []).map((q) => ({
    question: q.question || "", maxMarks: Number(q.maxMarks) || 0, modelAnswer: q.modelAnswer || "",
  }));
  const total = questions.reduce((n, q) => n + q.maxMarks, 0);

  // AI-grade each answer out of its maxMarks. If AI isn't configured or errors,
  // save the attempt unscored (0) so it's recorded; admin review can come later.
  let breakdown = questions.map((q) => ({ question: q.question, maxMarks: q.maxMarks, marks: 0, feedback: "", gradedBy: "pending" }));
  let graded = false;
  if (isAIConfigured() && questions.length) {
    try {
      const grades = await gradeWrittenAnswers(questions, answers, { course: course.title, title: item.name });
      breakdown = questions.map((q, i) => ({
        question: q.question, maxMarks: q.maxMarks,
        marks: grades[i]?.marks ?? 0, feedback: grades[i]?.feedback || "", gradedBy: "ai",
      }));
      graded = true;
    } catch (e) { console.error("Course exam AI-grade error:", e?.message); }
  }

  const score = breakdown.reduce((n, b) => n + (Number(b.marks) || 0), 0);
  const percentage = total ? Math.round((score / total) * 100) : 0;
  const passed = graded && percentage >= PASS_MARK;

  const doc = {
    studentId: auth.id, studentName: auth.name || "",
    assessmentId: aid, assessmentTitle: item.name || kind, course: course.title || "",
    type: kind, score, total, percentage, passed, breakdown,
  };
  try {
    if (useMock) {
      mockAssessmentResults().unshift({ _id: "ar_" + Date.now(), ...doc, createdAt: new Date() });
    } else {
      await AssessmentResult.create(doc);
    }
  } catch (e) { console.error("Course exam result save error:", e?.message); }

  return NextResponse.json({ success: true, kind, graded, score, total, percentage, passed, breakdown });
}
