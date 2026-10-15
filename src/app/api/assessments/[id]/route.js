import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { buildAssessmentDoc, serializeAssessment } from "@/lib/assessmentFields";
import Assessment from "@/models/Assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request) {
  const auth = await getAuthUser(request);
  if (!auth) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (auth.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { auth };
}

// GET /api/assessments/:id — full assessment (incl. question media base64) for
// the admin edit form. The list endpoint omits media for speed.
export async function GET(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const useMock = await resolveUseMock();
  const a = useMock
    ? mockAssessments().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Assessment.findById(id).lean().catch(() => null);
  if (!a) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  return NextResponse.json({ assessment: serializeAssessment(a) });
}

export async function PUT(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  const patch = buildAssessmentDoc(b);
  if (!patch.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

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
