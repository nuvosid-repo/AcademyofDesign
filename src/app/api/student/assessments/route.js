import { NextResponse } from "next/server";
import { resolveUseMock, mockEnrollments, mockAssessments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeAssessment } from "@/lib/assessmentFields";
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

  const titles = new Set(enrollments.map((e) => e.courseTitle).filter(Boolean));
  const resultByAid = {};
  for (const r of results) resultByAid[r.assessmentId] = r;

  const assessments = all
    .filter((a) => (a.status || "Active") !== "Inactive" && a.course && titles.has(a.course))
    .map((a) => {
      const s = serializeAssessment(a);
      const r = resultByAid[s.id] || {};
      return {
        id: s.id,
        title: s.title,
        course: s.course,
        description: s.description,
        // MCQ (questions/options only — no correct answers)
        mcqEnabled: s.mcqEnabled,
        mcqCount: (s.questions || []).length,
        mcqQuestions: (s.questions || []).map((q) => ({ question: q.question || "", options: q.options || [] })),
        passingScore: s.passingScore,
        mcqDone: !!r.mcqDone,
        mcqScore: r.mcqScore || 0, mcqTotal: r.mcqTotal || 0, mcqPercentage: r.mcqPercentage || 0,
        // Written
        writtenEnabled: s.writtenEnabled,
        writtenQuestions: (s.writtenQuestions || []).map((q) => ({ question: q.question || "", maxMarks: q.maxMarks || 0 })),
        writtenSubmitted: !!r.writtenSubmitted,
        writtenGraded: !!r.writtenGraded,
        writtenScore: r.writtenScore || 0, writtenTotal: r.writtenTotal || 0,
        // Interview
        interviewEnabled: s.interviewEnabled,
        interviewDate: s.interviewDate, interviewTime: s.interviewTime, interviewLink: s.interviewLink, interviewer: s.interviewer,
        interviewGraded: !!r.interviewGraded,
        interviewScore: r.interviewScore || 0, interviewTotal: r.interviewTotal || 0,
      };
    });

  return NextResponse.json({ assessments });
}
