import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeAssessment, buildAssessmentDoc } from "@/lib/assessmentFields";
import Assessment from "@/models/Assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ assessments: mockAssessments().map(serializeAssessment) });

  // Drop the base64 question media (images/PDFs) from the list — it loads on edit
  // via GET /:id. Question text/options stay so the table flags still work.
  const docs = await Assessment.find()
    .select("-questions.media -questionsB.media -writtenQuestions.media -writtenQuestionsB.media -interviewQuestions.media -interviewQuestionsB.media")
    .sort({ createdAt: -1 }).lean();
  return NextResponse.json({ assessments: docs.map(serializeAssessment) });
}

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const doc = buildAssessmentDoc(b);
  if (!doc.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!doc.mcqEnabled && !doc.writtenEnabled && !doc.interviewEnabled) {
    return NextResponse.json({ error: "Enable at least one section (MCQ / Written / Interview)" }, { status: 400 });
  }

  const useMock = await resolveUseMock();
  if (useMock) {
    const created = { _id: "as_" + Date.now(), ...doc, createdAt: new Date() };
    mockAssessments().unshift(created);
    return NextResponse.json({ success: true, assessment: serializeAssessment(created) }, { status: 201 });
  }

  const created = await Assessment.create(doc);
  return NextResponse.json({ success: true, assessment: serializeAssessment(created) }, { status: 201 });
}
