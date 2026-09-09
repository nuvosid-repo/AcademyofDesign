import { NextResponse } from "next/server";
import { resolveUseMock, mockAdminUsers } from "@/lib/db";
import { getAuthUser, bcrypt } from "@/lib/auth";
import AdminUser from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request) {
  const auth = await getAuthUser(request);
  if (!auth) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (auth.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { auth };
}

// PUT /api/users/:id — update a panel user (password optional).
export async function PUT(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;
  const b = await request.json().catch(() => ({}));

  const patch = {};
  for (const f of ["name", "email", "contactNo", "role", "username", "status"]) {
    if (b[f] != null) patch[f] = typeof b[f] === "string" ? b[f].trim() : b[f];
  }
  if (patch.email) patch.email = patch.email.toLowerCase();
  if (b.password) patch.password = await bcrypt.hash(b.password, await bcrypt.genSalt(10));

  const useMock = await resolveUseMock();
  if (useMock) {
    const u = mockAdminUsers().find((x) => x._id === id);
    if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
    Object.assign(u, patch);
    return NextResponse.json({ success: true });
  }

  await AdminUser.findByIdAndUpdate(id, patch);
  return NextResponse.json({ success: true });
}

// DELETE /api/users/:id
export async function DELETE(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockAdminUsers();
    const idx = store.findIndex((u) => u._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }

  await AdminUser.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
