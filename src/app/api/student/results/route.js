import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessmentResults, mockAssessments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import AssessmentResult from "@/models/AssessmentResult";
import Assessment from "@/models/Assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(r) {
  return {
    id: (r._id && r._id.toString()) || r.id,
    assessmentTitle: r.assessmentTitle || "",
    course: r.course || "",
    type: r.type || "MCQ",
    score: r.score || 0,
    total: r.total || 0,
    percentage: r.percentage || 0,
    passed: !!r.passed,
    createdAt: r.createdAt,
  };
}

// GET /api/student/results — the student's own assessment/quiz scores.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();
  const docs = useMock
    ? mockAssessmentResults().filter((r) => r.studentId === auth.id)
    : await AssessmentResult.find({ studentId: auth.id }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ results: docs.map(serialize) });
}

// POST /api/student/results — submit answers for an assessment; the score is
// computed server-side against the correct answers, then stored. (Used by the
// MCQ test-taking flow.) Body: { assessmentId, answers: [selectedIndex...] }
export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assessmentId, answers } = await request.json().catch(() => ({}));
  if (!assessmentId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "assessmentId and answers are required" }, { status: 400 });
  }

  const useMock = await resolveUseMock();
  const assessment = useMock
    ? mockAssessments().find((a) => ((a._id && a._id.toString()) || a.id) === assessmentId)
    : await Assessment.findById(assessmentId).lean();
  if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const questions = assessment.questions || [];
  const total = questions.length;
  let score = 0;
  questions.forEach((q, i) => { if (Number(answers[i]) === Number(q.correctIndex)) score++; });
  const percentage = total ? Math.round((score / total) * 100) : 0;
  const passed = percentage >= (assessment.passingScore || 0);

  const doc = {
    studentId: auth.id, studentName: auth.name || "",
    assessmentId, assessmentTitle: assessment.title || "", course: assessment.course || "",
    type: assessment.type || "MCQ", score, total, percentage, passed,
  };

  if (useMock) {
    const created = { _id: "ar_" + Date.now(), ...doc, createdAt: new Date() };
    mockAssessmentResults().unshift(created);
    return NextResponse.json({ success: true, result: serialize(created) }, { status: 201 });
  }
  const created = await AssessmentResult.create(doc);
  return NextResponse.json({ success: true, result: serialize(created) }, { status: 201 });
}
