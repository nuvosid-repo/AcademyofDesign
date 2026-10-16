import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments, mockEnrollments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeAssessment, pickSet, combinedResult } from "@/lib/assessmentFields";
import Assessment from "@/models/Assessment";
import Enrollment from "@/models/Enrollment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/assessments/:id/submissions — admin: the assessment plus every
// enrolled student and their current result (for grading).
export async function GET(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const useMock = await resolveUseMock();
  const a = useMock
    ? mockAssessments().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Assessment.findById(id).lean().catch(() => null);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const s = serializeAssessment(a);

  const [enrollments, results] = useMock
    ? [mockEnrollments().filter((e) => e.courseTitle === s.course), mockAssessmentResults().filter((r) => r.assessmentId === id)]
    : await Promise.all([
        Enrollment.find({ courseTitle: s.course }).lean(),
        AssessmentResult.find({ assessmentId: id }).lean(),
      ]);

  const resultBy = {};
  for (const r of results) resultBy[r.studentId] = r;

  // Unique enrolled students
  const seen = new Set();
  const students = [];
  for (const e of enrollments) {
    if (!e.studentId || seen.has(e.studentId)) continue;
    seen.add(e.studentId);
    const r = resultBy[e.studentId] || {};
    // Grade against the question set this student actually took (A or B).
    const examSet = r.examSet || ((r.attempt || 1) >= 2 ? "B" : "A");
    const setQ = pickSet(s, examSet);
    const combined = combinedResult(s, r);
    students.push({
      combinedReady: combined.ready, combinedPercentage: combined.percentage, combinedPassed: combined.passed,
      combinedScore: combined.totalScore, combinedTotal: combined.totalMax,
      studentId: e.studentId,
      name: e.studentName || r.studentName || "",
      email: e.studentEmail || "",
      attempt: r.attempt || 1, examSet,
      writtenQuestions: setQ.writtenQuestions, interviewQuestions: setQ.interviewQuestions,
      mcqDone: !!r.mcqDone, mcqScore: r.mcqScore || 0, mcqTotal: r.mcqTotal || 0, mcqPercentage: r.mcqPercentage || 0, mcqPassed: !!r.passed,
      writtenSubmitted: !!r.writtenSubmitted, writtenGraded: !!r.writtenGraded, writtenScore: r.writtenScore || 0, writtenTotal: r.writtenTotal || 0,
      writtenAnswers: r.writtenAnswers || [],
      writtenBreakdown: r.writtenBreakdown || [],
      interviewGraded: !!r.interviewGraded, interviewScore: r.interviewScore || 0, interviewTotal: r.interviewTotal || 0,
      interviewBreakdown: r.interviewBreakdown || [],
      interviewVideoUrl: r.interviewVideoUrl || "",
    });
  }

  return NextResponse.json({
    assessment: {
      id: s.id, title: s.title, course: s.course, passingScore: s.passingScore,
      writtenEnabled: s.writtenEnabled, writtenQuestions: s.writtenQuestions,
      interviewEnabled: s.interviewEnabled, interviewQuestions: s.interviewQuestions, interviewer: s.interviewer,
      mcqEnabled: s.mcqEnabled,
    },
    students,
  });
}
