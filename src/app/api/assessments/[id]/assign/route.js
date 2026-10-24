import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Assessment from "@/models/Assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/assessments/:id/assign — admin: add/remove students on an Individual
// (B2B) assessment. Body: { studentIds: [...], action: "add" | "remove" }.
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { studentIds, action = "add" } = await request.json().catch(() => ({}));
  const ids = [...new Set((Array.isArray(studentIds) ? studentIds : []).map((x) => (x || "").toString()).filter(Boolean))];
  if (!ids.length) return NextResponse.json({ error: "Select at least one student" }, { status: 400 });

  const useMock = await resolveUseMock();
  const a = useMock
    ? mockAssessments().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Assessment.findById(id).lean().catch(() => null);
  if (!a) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const current = (a.assignedStudentIds || []).map(String);
  const next = action === "remove"
    ? current.filter((sid) => !ids.includes(sid))
    : [...new Set([...current, ...ids])];

  // Assigning students makes it an Individual (B2B) assessment.
  const set = { assignedStudentIds: next };
  if (action !== "remove") set.audience = "B2B";

  if (useMock) {
    const rec = mockAssessments().find((x) => ((x._id && x._id.toString()) || x.id) === id);
    if (rec) Object.assign(rec, set);
    return NextResponse.json({ success: true, assignedStudentIds: next });
  }
  await Assessment.findByIdAndUpdate(id, { $set: set });
  return NextResponse.json({ success: true, assignedStudentIds: next });
}
