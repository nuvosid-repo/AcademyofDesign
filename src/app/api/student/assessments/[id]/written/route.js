import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments, mockEnrollments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { isAIConfigured, gradeWrittenAnswers } from "@/lib/ai";
import Assessment from "@/models/Assessment";
import Enrollment from "@/models/Enrollment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/student/assessments/:id/written — submit written-exam answers (one
// submission). Admin grades them later. Body: { answers: [text...] }
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { answers } = await request.json().catch(() => ({}));
  if (!Array.isArray(answers)) return NextResponse.json({ error: "answers required" }, { status: 400 });

  const useMock = await resolveUseMock();
  const a = useMock
    ? mockAssessments().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Assessment.findById(id).lean().catch(() => null);
  if (!a) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  if (!a.writtenEnabled) return NextResponse.json({ error: "This assessment has no written section" }, { status: 400 });

  const enrollments = useMock ? mockEnrollments().filter((e) => e.studentId === auth.id) : await Enrollment.find({ studentId: auth.id }).lean();
  if (!enrollments.some((e) => e.courseTitle === a.course)) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  const existing = useMock
    ? mockAssessmentResults().find((r) => r.studentId === auth.id && r.assessmentId === id)
    : await AssessmentResult.findOne({ studentId: auth.id, assessmentId: id }).lean();
  if (existing?.writtenSubmitted) return NextResponse.json({ error: "You have already submitted the written exam." }, { status: 400 });

  // Use the question set the student is on (Set B on a 2nd attempt).
  const attempt = existing?.attempt || 1;
  const examSet = existing?.examSet || (attempt >= 2 ? "B" : "A");
  const useB = examSet === "B" && a.setBEnabled;
  const writtenQs = (useB && (a.writtenQuestionsB || []).length) ? a.writtenQuestionsB : (a.writtenQuestions || []);
  const writtenAnswers = writtenQs.map((q, i) => ({ question: q.question || "", answer: (answers[i] || "").toString() }));
  const setFields = {
    studentId: auth.id, studentName: auth.name || "", assessmentId: id, assessmentTitle: a.title || "", course: a.course || "", type: "Assessment",
    attempt, examSet,
    writtenAnswers, writtenSubmitted: true, updatedAt: new Date(),
  };

  // Auto-grade with Claude (best-effort). If AI isn't configured or errors,
  // the submission is still saved and an admin can grade/override later.
  let aiGraded = false;
  if (isAIConfigured()) {
    try {
      const grades = await gradeWrittenAnswers(
        writtenQs.map((q) => ({ question: q.question, maxMarks: q.maxMarks, modelAnswer: q.modelAnswer })),
        answers,
        { course: a.course, title: a.title }
      );
      const breakdown = writtenQs.map((q, i) => ({
        question: q.question || "", maxMarks: Number(q.maxMarks) || 0,
        marks: grades[i]?.marks ?? 0, feedback: grades[i]?.feedback || "", gradedBy: "ai",
      }));
      setFields.writtenBreakdown = breakdown;
      setFields.writtenScore = breakdown.reduce((n, b) => n + b.marks, 0);
      setFields.writtenTotal = breakdown.reduce((n, b) => n + b.maxMarks, 0);
      setFields.writtenGraded = true;
      aiGraded = true;
    } catch (e) {
      console.error("AI written grading failed:", e?.message);
    }
  }

  if (useMock) {
    const store = mockAssessmentResults();
    const idx = store.findIndex((r) => r.studentId === auth.id && r.assessmentId === id);
    if (idx === -1) store.unshift({ _id: "ar_" + Date.now(), ...setFields, createdAt: new Date() });
    else Object.assign(store[idx], setFields);
  } else {
    await AssessmentResult.findOneAndUpdate({ studentId: auth.id, assessmentId: id }, { $set: setFields, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  }

  return NextResponse.json({
    success: true, aiGraded,
    writtenScore: setFields.writtenScore ?? null,
    writtenTotal: setFields.writtenTotal ?? null,
  });
}
