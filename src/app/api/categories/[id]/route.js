import { NextResponse } from "next/server";
import { resolveUseMock, mockCategories } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Category from "@/models/Category";

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
  if (b.name != null) patch.name = b.name.trim();
  if (b.status != null) patch.status = b.status;

  const useMock = await resolveUseMock();
  if (useMock) {
    const c = mockCategories().find((x) => x._id === id);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    Object.assign(c, patch);
    return NextResponse.json({ success: true });
  }
  await Category.findByIdAndUpdate(id, patch);
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockCategories();
    const idx = store.findIndex((x) => x._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }
  await Category.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
