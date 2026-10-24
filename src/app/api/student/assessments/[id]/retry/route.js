import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments, mockEnrollments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeAssessment, combinedResult, studentHasAccess } from "@/lib/assessmentFields";
import Assessment from "@/models/Assessment";
import Enrollment from "@/models/Enrollment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/student/assessments/:id/retry — a student who FAILED the MCQ on
// their first attempt starts a second attempt with Set B. Max 2 attempts.
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const useMock = await resolveUseMock();
  const a = useMock
    ? mockAssessments().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Assessment.findById(id).lean().catch(() => null);
  if (!a) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  if (!a.setBEnabled) return NextResponse.json({ error: "This assessment has no second attempt" }, { status: 400 });

  const enrollments = useMock ? mockEnrollments().filter((e) => e.studentId === auth.id) : await Enrollment.find({ studentId: auth.id }).lean();
  if (!studentHasAccess(a, auth.id, enrollments)) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  const existing = useMock
    ? mockAssessmentResults().find((r) => r.studentId === auth.id && r.assessmentId === id)
    : await AssessmentResult.findOne({ studentId: auth.id, assessmentId: id }).lean();

  if (!existing) return NextResponse.json({ error: "Complete the first attempt before retrying" }, { status: 400 });
  if ((existing.attempt || 1) >= 2) return NextResponse.json({ error: "You have used both attempts" }, { status: 400 });

  // Pass/fail is the combined score across all enabled sections. Retry is only
  // allowed once every section is scored AND the combined result is a fail.
  const combined = combinedResult(serializeAssessment(a), existing);
  if (!combined.ready) return NextResponse.json({ error: "Your result is still being graded — retry unlocks once it's a confirmed fail." }, { status: 400 });
  if (combined.passed) return NextResponse.json({ error: "You passed — no retry needed" }, { status: 400 });

  // Reset every section for a fresh Set B attempt.
  const setFields = {
    attempt: 2, examSet: "B",
    mcqDone: false, mcqScore: 0, mcqTotal: 0, mcqPercentage: 0,
    score: 0, total: 0, percentage: 0, passed: false,
    writtenSubmitted: false, writtenAnswers: [], writtenGraded: false, writtenBreakdown: [], writtenScore: 0, writtenTotal: 0,
    interviewGraded: false, interviewBreakdown: [], interviewScore: 0, interviewTotal: 0,
    updatedAt: new Date(),
  };

  if (useMock) {
    const store = mockAssessmentResults();
    const idx = store.findIndex((r) => r.studentId === auth.id && r.assessmentId === id);
    if (idx !== -1) Object.assign(store[idx], setFields);
  } else {
    await AssessmentResult.updateOne({ studentId: auth.id, assessmentId: id }, { $set: setFields });
  }

  return NextResponse.json({ success: true, attempt: 2, examSet: "B" });
}
