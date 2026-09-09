import { NextResponse } from "next/server";
import { resolveUseMock, mockVideos } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Video from "@/models/Video";

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
  for (const f of ["title", "url", "courseId", "course", "description", "status"]) {
    if (b[f] != null) patch[f] = typeof b[f] === "string" ? b[f].trim() : b[f];
  }

  const useMock = await resolveUseMock();
  if (useMock) {
    const v = mockVideos().find((x) => x._id === id);
    if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
    Object.assign(v, patch);
    return NextResponse.json({ success: true });
  }
  await Video.findByIdAndUpdate(id, patch);
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockVideos();
    const idx = store.findIndex((x) => x._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }
  await Video.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
