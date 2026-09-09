import { NextResponse } from "next/server";
import { resolveUseMock, mockInstructors } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { buildInstructorDoc } from "@/lib/instructorFields";
import Instructor from "@/models/Instructor";

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
  const patch = buildInstructorDoc(b);
  if (!patch.name || !patch.designation) {
    return NextResponse.json({ error: "Name and designation are required" }, { status: 400 });
  }

  const useMock = await resolveUseMock();
  if (useMock) {
    const i = mockInstructors().find((x) => x._id === id);
    if (!i) return NextResponse.json({ error: "Not found" }, { status: 404 });
    Object.assign(i, patch);
    return NextResponse.json({ success: true });
  }

  await Instructor.findByIdAndUpdate(id, patch);
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockInstructors();
    const idx = store.findIndex((x) => x._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }

  await Instructor.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
