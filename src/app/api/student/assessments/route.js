import { NextResponse } from "next/server";
import { resolveUseMock, mockEnrollments, mockAssessments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeAssessment, pickSet, combinedResult } from "@/lib/assessmentFields";
import { isEnrollmentActive } from "@/lib/enrollment";
import Enrollment from "@/models/Enrollment";
import Assessment from "@/models/Assessment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/student/assessments — assessments for the student's enrolled courses,
// each with its sections and the student's own result/status.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();
  const [enrollments, all, results] = useMock
    ? [mockEnrollments().filter((e) => e.studentId === auth.id), mockAssessments(), mockAssessmentResults().filter((r) => r.studentId === auth.id)]
    : await Promise.all([
        Enrollment.find({ studentId: auth.id }).lean(),
        Assessment.find().lean(),
        AssessmentResult.find({ studentId: auth.id }).lean(),
      ]);

  const titles = new Set(enrollments.filter((e) => isEnrollmentActive(e)).map((e) => e.courseTitle).filter(Boolean));
  const resultByAid = {};
  for (const r of results) resultByAid[r.assessmentId] = r;

  // A student sees an assessment when it's Active AND either:
  //   • B2B — they are in the assessment's assignedStudentIds, or
  //   • B2C — they are enrolled (active) in the assessment's course.
  const visibleTo = (a) => {
    if ((a.status || "Active") === "Inactive") return false;
    if (a.audience === "B2B") return (a.assignedStudentIds || []).map(String).includes(auth.id);
    return !!(a.course && titles.has(a.course));
  };

  const assessments = all
    .filter(visibleTo)
    .map((a) => {
      const s = serializeAssessment(a);
      const r = resultByAid[s.id] || {};
      // Which set the student is on: attempt 2 → Set B, else Set A.
      const attempt = r.attempt || 1;
      const examSet = r.examSet || (attempt >= 2 ? "B" : "A");
      const setQ = pickSet(s, examSet);
      // Pass/fail is the COMBINED % across all enabled sections, decided only
      // once every section is scored. Retry (Set B) unlocks on a combined fail.
      const combined = combinedResult(s, r);
      const canRetry = !!(s.setBEnabled && combined.ready && !combined.passed && attempt < 2);
      return {
        id: s.id,
        title: s.title,
        course: s.course,
        description: s.description,
        // Attempt / retry state
        attempt, examSet, setBEnabled: s.setBEnabled, canRetry,
        combinedReady: combined.ready, combinedPercentage: combined.percentage, combinedPassed: combined.passed,
        combinedScore: combined.totalScore, combinedTotal: combined.totalMax,
        // MCQ (questions/options only — no correct answers), from the active set
        mcqEnabled: s.mcqEnabled,
        mcqCount: (setQ.questions || []).length,
        mcqQuestions: (setQ.questions || []).map((q) => ({ question: q.question || "", options: q.options || [], multiple: !!q.multiple, media: q.media || "" })),
        passingScore: s.passingScore,
        mcqDone: !!r.mcqDone,
        mcqScore: r.mcqScore || 0, mcqTotal: r.mcqTotal || 0, mcqPercentage: r.mcqPercentage || 0,
        // Written (from the active set)
        writtenEnabled: s.writtenEnabled,
        writtenQuestions: (setQ.writtenQuestions || []).map((q) => ({ question: q.question || "", maxMarks: q.maxMarks || 0, media: q.media || "" })),
        writtenSubmitted: !!r.writtenSubmitted,
        writtenGraded: !!r.writtenGraded,
        writtenScore: r.writtenScore || 0, writtenTotal: r.writtenTotal || 0,
        // Interview
        interviewEnabled: s.interviewEnabled,
        interviewDate: s.interviewDate, interviewTime: s.interviewTime, interviewLink: s.interviewLink, interviewer: s.interviewer,
        interviewQuestions: (setQ.interviewQuestions || []).map((q) => ({ question: q.question || "", maxMarks: q.maxMarks || 0, media: q.media || "" })),
        interviewGraded: !!r.interviewGraded,
        interviewScore: r.interviewScore || 0, interviewTotal: r.interviewTotal || 0,
      };
    });

  return NextResponse.json({ assessments });
}
