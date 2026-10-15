import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeAssessment, pickSet } from "@/lib/assessmentFields";
import { isAIConfigured, gradeWrittenAnswers } from "@/lib/ai";
import Assessment from "@/models/Assessment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // AI calls can take a few seconds

// POST /api/assessments/:id/ai-grade — admin triggers Claude grading of a
// student's WRITTEN exam. Body: { studentId }. Fills writtenBreakdown/score and
// marks it graded; the admin can still override on the score page afterward.
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAIConfigured()) return NextResponse.json({ error: "AI is not configured (set ANTHROPIC_API_KEY)." }, { status: 400 });
  const { id } = await params;
  const { studentId } = await request.json().catch(() => ({}));
  if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

  const useMock = await resolveUseMock();
  const a = useMock
    ? mockAssessments().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Assessment.findById(id).lean().catch(() => null);
  if (!a) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  const s = serializeAssessment(a);

  const result = useMock
    ? mockAssessmentResults().find((r) => r.studentId === studentId && r.assessmentId === id)
    : await AssessmentResult.findOne({ studentId, assessmentId: id }).lean().catch(() => null);
  if (!result || !result.writtenSubmitted) return NextResponse.json({ error: "This student hasn't submitted the written exam yet." }, { status: 400 });

  const examSet = result.examSet || ((result.attempt || 1) >= 2 ? "B" : "A");
  const setQ = pickSet(s, examSet);
  const writtenQs = setQ.writtenQuestions || [];
  // Student answers (stored with the question text) aligned to the set.
  const answers = (result.writtenAnswers || []).map((x) => x?.answer || "");

  let grades;
  try {
    grades = await gradeWrittenAnswers(
      writtenQs.map((q) => ({ question: q.question, maxMarks: q.maxMarks, modelAnswer: q.modelAnswer })),
      answers,
      { course: s.course, title: s.title }
    );
  } catch (e) {
    return NextResponse.json({ error: "AI grading failed: " + (e?.message || "unknown error") }, { status: 502 });
  }

  const breakdown = writtenQs.map((q, i) => ({
    question: q.question || "", maxMarks: Number(q.maxMarks) || 0,
    marks: grades[i]?.marks ?? 0, feedback: grades[i]?.feedback || "", gradedBy: "ai",
  }));
  const writtenScore = breakdown.reduce((n, b) => n + b.marks, 0);
  const writtenTotal = breakdown.reduce((n, b) => n + b.maxMarks, 0);
  const setFields = { writtenBreakdown: breakdown, writtenScore, writtenTotal, writtenGraded: true, updatedAt: new Date() };

  if (useMock) {
    const store = mockAssessmentResults();
    const idx = store.findIndex((r) => r.studentId === studentId && r.assessmentId === id);
    if (idx !== -1) Object.assign(store[idx], setFields);
  } else {
    await AssessmentResult.updateOne({ studentId, assessmentId: id }, { $set: setFields });
  }

  return NextResponse.json({ success: true, writtenScore, writtenTotal, breakdown });
}
