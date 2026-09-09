import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments, mockEnrollments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
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

  const writtenAnswers = (a.writtenQuestions || []).map((q, i) => ({ question: q.question || "", answer: (answers[i] || "").toString() }));
  const setFields = {
    studentId: auth.id, studentName: auth.name || "", assessmentId: id, assessmentTitle: a.title || "", course: a.course || "", type: "Assessment",
    writtenAnswers, writtenSubmitted: true, updatedAt: new Date(),
  };

  if (useMock) {
    const store = mockAssessmentResults();
    const idx = store.findIndex((r) => r.studentId === auth.id && r.assessmentId === id);
    if (idx === -1) store.unshift({ _id: "ar_" + Date.now(), ...setFields, createdAt: new Date() });
    else Object.assign(store[idx], setFields);
  } else {
    await AssessmentResult.findOneAndUpdate({ studentId: auth.id, assessmentId: id }, { $set: setFields, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  }

  return NextResponse.json({ success: true });
}
