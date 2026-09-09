import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeAssessment } from "@/lib/assessmentFields";
import Assessment from "@/models/Assessment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clamp = (v, max) => Math.max(0, Math.min(Number(v) || 0, Number(max) || 0));

// POST /api/assessments/:id/grade — admin/interviewer grades one section for one
// student. Body: { studentId, studentName, section: "written"|"interview", marks: [n...] }
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { studentId, studentName, section, marks } = await request.json().catch(() => ({}));
  if (!studentId || !["written", "interview"].includes(section) || !Array.isArray(marks)) {
    return NextResponse.json({ error: "studentId, section and marks are required" }, { status: 400 });
  }

  const useMock = await resolveUseMock();
  const a = useMock
    ? mockAssessments().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Assessment.findById(id).lean().catch(() => null);
  if (!a) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  const s = serializeAssessment(a);

  const questions = section === "written" ? s.writtenQuestions : s.interviewQuestions;
  const breakdown = questions.map((q, i) => ({ question: q.question || "", maxMarks: q.maxMarks || 0, marks: clamp(marks[i], q.maxMarks || 0) }));
  const score = breakdown.reduce((n, b) => n + b.marks, 0);
  const total = breakdown.reduce((n, b) => n + b.maxMarks, 0);

  const setFields = section === "written"
    ? { writtenBreakdown: breakdown, writtenScore: score, writtenTotal: total, writtenGraded: true }
    : { interviewBreakdown: breakdown, interviewScore: score, interviewTotal: total, interviewGraded: true };
  const base = { studentId, studentName: studentName || "", assessmentId: id, assessmentTitle: s.title || "", course: s.course || "", type: "Assessment", updatedAt: new Date() };

  if (useMock) {
    const store = mockAssessmentResults();
    const idx = store.findIndex((r) => r.studentId === studentId && r.assessmentId === id);
    if (idx === -1) store.unshift({ _id: "ar_" + Date.now(), ...base, ...setFields, createdAt: new Date() });
    else Object.assign(store[idx], base, setFields);
  } else {
    await AssessmentResult.findOneAndUpdate({ studentId, assessmentId: id }, { $set: { ...base, ...setFields }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  }

  return NextResponse.json({ success: true, score, total });
}
