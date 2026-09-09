import { NextResponse } from "next/server";
import { resolveUseMock, mockRoles } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Role from "@/models/Role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(r) {
  return {
    id: (r._id && r._id.toString()) || r.id,
    name: r.name,
    status: r.status || "Active",
    permissions: r.permissions || {},
    createdAt: r.createdAt,
  };
}

// GET /api/roles — admin only. Lists roles.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ roles: mockRoles().map(serialize) });

  const docs = await Role.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ roles: docs.map(serialize) });
}

// POST /api/roles — admin only. Creates a role.
export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = (body.name || "").trim();
  const permissions = body.permissions || {};
  const status = body.status === "Inactive" ? "Inactive" : "Active";
  if (!name) return NextResponse.json({ error: "Role name is required" }, { status: 400 });

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockRoles();
    if (store.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: "Role already exists" }, { status: 400 });
    }
    const role = { _id: "r_" + Date.now(), name, permissions, status, createdAt: new Date() };
    store.unshift(role);
    return NextResponse.json({ success: true, role: serialize(role) }, { status: 201 });
  }

  const role = await Role.create({ name, permissions, status });
  return NextResponse.json({ success: true, role: serialize(role) }, { status: 201 });
}
