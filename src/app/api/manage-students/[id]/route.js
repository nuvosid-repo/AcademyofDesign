import { NextResponse } from "next/server";
import { resolveUseMock, mockStudents } from "@/lib/db";
import { getAuthUser, bcrypt } from "@/lib/auth";
import Student from "@/models/Student";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELDS = [
  "name", "email", "dateOfBirth", "gender", "image", "contactNumber",
  "qualification", "institutionName", "country", "address", "identityProof",
  "subscriptionType", "status",
];

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
  for (const f of FIELDS) if (b[f] != null) patch[f] = typeof b[f] === "string" ? b[f].trim?.() ?? b[f] : b[f];
  if (patch.email) patch.email = patch.email.toLowerCase();
  if (b.password) patch.password = await bcrypt.hash(b.password, await bcrypt.genSalt(10));

  const useMock = await resolveUseMock();
  if (useMock) {
    const s = mockStudents().find((x) => x._id === id);
    if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
    Object.assign(s, patch);
    return NextResponse.json({ success: true });
  }
  await Student.findByIdAndUpdate(id, patch);
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockStudents();
    const idx = store.findIndex((x) => x._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }
  await Student.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
