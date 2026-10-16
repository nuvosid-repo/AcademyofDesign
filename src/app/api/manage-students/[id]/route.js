import { NextResponse } from "next/server";
import { resolveUseMock, mockStudents } from "@/lib/db";
import { getAuthUser, bcrypt } from "@/lib/auth";
import { offloadMedia } from "@/lib/cloudinary";
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

// GET /api/manage-students/:id — full student (incl. image + identityProof
// base64), used by the admin view modal & edit form. The list omits these.
export async function GET(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;
  const useMock = await resolveUseMock();
  const s = useMock
    ? mockStudents().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Student.findById(id).select("-password").lean().catch(() => null);
  if (!s) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  const student = { id: (s._id && s._id.toString()) || s.id, createdAt: s.createdAt };
  for (const f of FIELDS) student[f] = s[f] ?? "";
  return NextResponse.json({ student });
}

export async function PUT(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;
  const b = await request.json().catch(() => ({}));

  let patch = {};
  for (const f of FIELDS) if (b[f] != null) patch[f] = typeof b[f] === "string" ? b[f].trim?.() ?? b[f] : b[f];
  if (patch.email) patch.email = patch.email.toLowerCase();
  if (b.password) patch.password = await bcrypt.hash(b.password, await bcrypt.genSalt(10));
  // Offload any newly-added base64 avatar / identity proof to Cloudinary.
  patch = await offloadMedia(patch, { folder: "nuvosid/students" });

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
