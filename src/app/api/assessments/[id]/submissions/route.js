import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments, mockEnrollments, mockAssessmentResults, mockStudents } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeAssessment, pickSet, combinedResult } from "@/lib/assessmentFields";
import Assessment from "@/models/Assessment";
import Enrollment from "@/models/Enrollment";
import AssessmentResult from "@/models/AssessmentResult";
import Student from "@/models/Student";

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

  const results = useMock
    ? mockAssessmentResults().filter((r) => r.assessmentId === id)
    : await AssessmentResult.find({ assessmentId: id }).lean();
  const resultBy = {};
  for (const r of results) resultBy[r.studentId] = r;

  // Who appears in the grading list:
  //   B2B → the specific assigned students; B2C → everyone enrolled in the course.
  let participants = [];
  if (s.audience === "B2B") {
    const ids = s.assignedStudentIds || [];
    const docs = useMock
      ? mockStudents().filter((st) => ids.includes((st._id && st._id.toString()) || st.id))
      : await Student.find({ _id: { $in: ids } }).select("name email").lean().catch(() => []);
    participants = docs.map((st) => ({ studentId: (st._id && st._id.toString()) || st.id, name: st.name || "", email: st.email || "" }));
  } else {
    const enrollments = useMock
      ? mockEnrollments().filter((e) => e.courseTitle === s.course)
      : await Enrollment.find({ courseTitle: s.course }).lean();
    const seen = new Set();
    for (const e of enrollments) {
      if (!e.studentId || seen.has(e.studentId)) continue;
      seen.add(e.studentId);
      participants.push({ studentId: e.studentId, name: e.studentName || "", email: e.studentEmail || "" });
    }
  }

  const students = [];
  for (const p of participants) {
    const r = resultBy[p.studentId] || {};
    // Grade against the question set this student actually took (A or B).
    const examSet = r.examSet || ((r.attempt || 1) >= 2 ? "B" : "A");
    const setQ = pickSet(s, examSet);
    const combined = combinedResult(s, r);
    students.push({
      combinedReady: combined.ready, combinedPercentage: combined.percentage, combinedPassed: combined.passed,
      combinedScore: combined.totalScore, combinedTotal: combined.totalMax,
      studentId: p.studentId,
      name: p.name || r.studentName || "",
      email: p.email || "",
      attempt: r.attempt || 1, examSet,
      writtenQuestions: setQ.writtenQuestions, interviewQuestions: setQ.interviewQuestions,
      mcqDone: !!r.mcqDone, mcqScore: r.mcqScore || 0, mcqTotal: r.mcqTotal || 0, mcqPercentage: r.mcqPercentage || 0, mcqPassed: !!r.passed,
      writtenSubmitted: !!r.writtenSubmitted, writtenGraded: !!r.writtenGraded, writtenScore: r.writtenScore || 0, writtenTotal: r.writtenTotal || 0,
      writtenAnswers: r.writtenAnswers || [],
      writtenBreakdown: r.writtenBreakdown || [],
      examVideoUrl: r.examVideoUrl || "",
      proctorFlags: r.proctorFlags || [],
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
