import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Assessment from "@/models/Assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(a) {
  return {
    id: (a._id && a._id.toString()) || a.id,
    title: a.title,
    course: a.course || "",
    type: a.type || "MCQ",
    description: a.description || "",
    questions: a.questions || [],
    passingScore: a.passingScore || 0,
    interviewDate: a.interviewDate || "",
    interviewTime: a.interviewTime || "",
    interviewLink: a.interviewLink || "",
    interviewer: a.interviewer || "",
    status: a.status || "Active",
    createdAt: a.createdAt,
  };
}

function buildDoc(b) {
  const type = b.type === "Live Interview" ? "Live Interview" : "MCQ";
  const doc = {
    title: (b.title || "").trim(),
    course: (b.course || "").trim(),
    type,
    description: (b.description || "").trim(),
    status: b.status === "Inactive" ? "Inactive" : "Active",
  };
  if (type === "MCQ") {
    doc.questions = Array.isArray(b.questions)
      ? b.questions
          .filter((q) => (q.question || "").trim() && (q.options || []).some((o) => (o || "").trim()))
          .map((q) => ({ question: q.question, options: q.options || [], correctIndex: q.correctIndex || 0 }))
      : [];
    doc.passingScore = Number(b.passingScore) || 0;
  } else {
    doc.interviewDate = (b.interviewDate || "").trim();
    doc.interviewTime = (b.interviewTime || "").trim();
    doc.interviewLink = (b.interviewLink || "").trim();
    doc.interviewer = (b.interviewer || "").trim();
  }
  return doc;
}

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ assessments: mockAssessments().map(serialize) });

  const docs = await Assessment.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ assessments: docs.map(serialize) });
}

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const doc = buildDoc(b);
  if (!doc.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const useMock = await resolveUseMock();
  if (useMock) {
    const created = { _id: "as_" + Date.now(), ...doc, createdAt: new Date() };
    mockAssessments().unshift(created);
    return NextResponse.json({ success: true, assessment: serialize(created) }, { status: 201 });
  }

  const created = await Assessment.create(doc);
  return NextResponse.json({ success: true, assessment: serialize(created) }, { status: 201 });
}
