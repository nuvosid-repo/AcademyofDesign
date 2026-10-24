import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments, mockEnrollments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeAssessment, pickSet, studentHasAccess } from "@/lib/assessmentFields";
import { isAIConfigured, gradeWrittenAnswers } from "@/lib/ai";
import Assessment from "@/models/Assessment";
import Enrollment from "@/models/Enrollment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/student/assessments/:id/interview — submit the AI-interview answers
// (voice transcripts). Claude scores each against the interviewer's questions.
// Body: { answers: [transcript...] }
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { answers, questions: bodyQs, videoUrl } = await request.json().catch(() => ({}));
  if (!Array.isArray(answers)) return NextResponse.json({ error: "answers required" }, { status: 400 });

  const useMock = await resolveUseMock();
  const a = useMock
    ? mockAssessments().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Assessment.findById(id).lean().catch(() => null);
  if (!a) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  const s = serializeAssessment(a);
  if (!s.interviewEnabled) return NextResponse.json({ error: "This assessment has no interview" }, { status: 400 });

  const enrollments = useMock ? mockEnrollments().filter((e) => e.studentId === auth.id) : await Enrollment.find({ studentId: auth.id }).lean();
  if (!studentHasAccess(s, auth.id, enrollments)) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  const existing = useMock
    ? mockAssessmentResults().find((r) => r.studentId === auth.id && r.assessmentId === id)
    : await AssessmentResult.findOne({ studentId: auth.id, assessmentId: id }).lean();
  const examSet = existing?.examSet || ((existing?.attempt || 1) >= 2 ? "B" : "A");
  // Prefer the questions actually asked (includes the warm-up intros); fall back
  // to the admin's interview questions for the set the student is on.
  const qs = (Array.isArray(bodyQs) && bodyQs.length)
    ? bodyQs.map((q) => ({ question: (q.question || "").toString(), maxMarks: Number(q.maxMarks) || 0 }))
    : (pickSet(s, examSet).interviewQuestions || []);

  let breakdown;
  if (isAIConfigured()) {
    try {
      const grades = await gradeWrittenAnswers(
        qs.map((q) => ({ question: q.question, maxMarks: q.maxMarks })),
        answers,
        { course: s.course, title: `${s.title} — Live Interview` }
      );
      breakdown = qs.map((q, i) => ({ question: q.question || "", maxMarks: Number(q.maxMarks) || 0, marks: grades[i]?.marks ?? 0, feedback: grades[i]?.feedback || "", gradedBy: "ai" }));
    } catch (e) {
      console.error("AI interview grading failed:", e?.message);
    }
  }
  // Fallback: store answers unscored (admin grades/overrides later).
  if (!breakdown) breakdown = qs.map((q, i) => ({ question: q.question || "", maxMarks: Number(q.maxMarks) || 0, marks: 0, feedback: "", answer: (answers[i] || "").toString() }));

  const interviewScore = breakdown.reduce((n, b) => n + (b.marks || 0), 0);
  const interviewTotal = breakdown.reduce((n, b) => n + (b.maxMarks || 0), 0);
  const graded = breakdown.some((b) => b.gradedBy === "ai");
  // Keep the transcript on each row so the admin can review it.
  breakdown = breakdown.map((b, i) => ({ ...b, answer: (answers[i] || "").toString() }));

  const setFields = {
    studentId: auth.id, studentName: auth.name || "", assessmentId: id, assessmentTitle: s.title || "", course: s.course || "", type: "Assessment",
    interviewBreakdown: breakdown, interviewScore, interviewTotal, interviewGraded: graded, updatedAt: new Date(),
  };
  // Store the recorded session URL (uploaded straight to Cloudinary by the client).
  if (typeof videoUrl === "string" && videoUrl) setFields.interviewVideoUrl = videoUrl;

  if (useMock) {
    const store = mockAssessmentResults();
    const idx = store.findIndex((r) => r.studentId === auth.id && r.assessmentId === id);
    if (idx === -1) store.unshift({ _id: "ar_" + Date.now(), ...setFields, createdAt: new Date() });
    else Object.assign(store[idx], setFields);
  } else {
    await AssessmentResult.findOneAndUpdate({ studentId: auth.id, assessmentId: id }, { $set: setFields, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  }

  return NextResponse.json({ success: true, graded, interviewScore, interviewTotal, breakdown });
}
