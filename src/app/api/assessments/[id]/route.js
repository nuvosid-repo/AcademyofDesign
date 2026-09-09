import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Assessment from "@/models/Assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request) {
  const auth = await getAuthUser(request);
  if (!auth) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (auth.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { auth };
}

export async function PUT(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;
  const b = await request.json().catch(() => ({}));

  const patch = {};
  for (const f of ["title", "course", "description", "interviewDate", "interviewTime", "interviewLink", "interviewer"]) {
    if (b[f] != null) patch[f] = String(b[f]).trim();
  }
  if (b.type != null) patch.type = b.type === "Live Interview" ? "Live Interview" : "MCQ";
  if (b.status != null) patch.status = b.status === "Inactive" ? "Inactive" : "Active";
  if (b.passingScore != null) patch.passingScore = Number(b.passingScore) || 0;
  if (Array.isArray(b.questions)) {
    patch.questions = b.questions
      .filter((q) => (q.question || "").trim() && (q.options || []).some((o) => (o || "").trim()))
      .map((q) => ({ question: q.question, options: q.options || [], correctIndex: q.correctIndex || 0 }));
  }

  const useMock = await resolveUseMock();
  if (useMock) {
    const a = mockAssessments().find((x) => x._id === id);
    if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
    Object.assign(a, patch);
    return NextResponse.json({ success: true });
  }

  await Assessment.findByIdAndUpdate(id, patch);
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockAssessments();
    const idx = store.findIndex((x) => x._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }

  await Assessment.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
