import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments, mockEnrollments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { isMcqCorrect, studentHasAccess } from "@/lib/assessmentFields";
import Assessment from "@/models/Assessment";
import Enrollment from "@/models/Enrollment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/student/assessments/:id/mcq — submit MCQ answers. Scored server-side,
// one attempt only. Body: { answers: [selectedOptionIndex...] }
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
  if (!a.mcqEnabled && !(a.type === "MCQ" && (a.questions || []).length)) {
    return NextResponse.json({ error: "This assessment has no MCQ section" }, { status: 400 });
  }

  const enrollments = useMock ? mockEnrollments().filter((e) => e.studentId === auth.id) : await Enrollment.find({ studentId: auth.id }).lean();
  if (!studentHasAccess(a, auth.id, enrollments)) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  // One attempt
  const existing = useMock
    ? mockAssessmentResults().find((r) => r.studentId === auth.id && r.assessmentId === id)
    : await AssessmentResult.findOne({ studentId: auth.id, assessmentId: id }).lean();
  if (existing?.mcqDone) {
    return NextResponse.json({ success: true, alreadyAttempted: true, score: existing.mcqScore, total: existing.mcqTotal, percentage: existing.mcqPercentage });
  }

  // Grade against the set the student is on (Set B on a 2nd attempt).
  const attempt = existing?.attempt || 1;
  const examSet = existing?.examSet || (attempt >= 2 ? "B" : "A");
  const useB = examSet === "B" && a.setBEnabled;
  const questions = (useB && (a.questionsB || []).length) ? a.questionsB : (a.questions || []);
  const total = questions.length;
  let score = 0;
  questions.forEach((q, i) => { if (isMcqCorrect(q, answers[i])) score++; });
  const percentage = total ? Math.round((score / total) * 100) : 0;
  const passed = percentage >= (a.passingScore || 0);

  const setFields = {
    studentId: auth.id, studentName: auth.name || "", assessmentId: id, assessmentTitle: a.title || "", course: a.course || "", type: "Assessment",
    attempt, examSet,
    mcqScore: score, mcqTotal: total, mcqPercentage: percentage, mcqDone: true,
    score, total, percentage, passed, updatedAt: new Date(),
  };

  if (useMock) {
    const store = mockAssessmentResults();
    const idx = store.findIndex((r) => r.studentId === auth.id && r.assessmentId === id);
    if (idx === -1) store.unshift({ _id: "ar_" + Date.now(), ...setFields, createdAt: new Date() });
    else Object.assign(store[idx], setFields);
  } else {
    await AssessmentResult.findOneAndUpdate({ studentId: auth.id, assessmentId: id }, { $set: setFields, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  }

  return NextResponse.json({ success: true, score, total, percentage, passed });
}
