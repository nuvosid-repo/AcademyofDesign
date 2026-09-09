import { NextResponse } from "next/server";
import { resolveUseMock, mockLiveClasses } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import LiveClass from "@/models/LiveClass";

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
  for (const f of ["title", "date", "time", "description", "link", "course"]) {
    if (b[f] != null) patch[f] = String(b[f]).trim();
  }
  if (b.type != null) patch.type = b.type === "Quiz" ? "Quiz" : "Live Class";
  if (b.status != null) patch.status = b.status === "Inactive" ? "Inactive" : "Active";

  const useMock = await resolveUseMock();
  if (useMock) {
    const l = mockLiveClasses().find((x) => x._id === id);
    if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });
    Object.assign(l, patch);
    return NextResponse.json({ success: true });
  }

  await LiveClass.findByIdAndUpdate(id, patch);
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockLiveClasses();
    const idx = store.findIndex((x) => x._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }

  await LiveClass.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
