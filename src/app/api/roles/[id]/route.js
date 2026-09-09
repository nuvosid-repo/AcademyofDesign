import { NextResponse } from "next/server";
import { resolveUseMock, mockRoles } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Role from "@/models/Role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request) {
  const auth = await getAuthUser(request);
  if (!auth) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (auth.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { auth };
}

// PUT /api/roles/:id — update a role.
export async function PUT(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockRoles();
    const role = store.find((r) => r._id === id);
    if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (body.name != null) role.name = body.name.trim();
    if (body.permissions != null) role.permissions = body.permissions;
    if (body.status != null) role.status = body.status;
    return NextResponse.json({ success: true });
  }

  await Role.findByIdAndUpdate(id, {
    ...(body.name != null ? { name: body.name.trim() } : {}),
    ...(body.permissions != null ? { permissions: body.permissions } : {}),
    ...(body.status != null ? { status: body.status } : {}),
  });
  return NextResponse.json({ success: true });
}

// DELETE /api/roles/:id
export async function DELETE(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockRoles();
    const idx = store.findIndex((r) => r._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }

  await Role.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
