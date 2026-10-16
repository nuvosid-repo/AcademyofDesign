import { NextResponse } from "next/server";
import { resolveUseMock, mockStudents } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { offloadMedia } from "@/lib/cloudinary";
import Student from "@/models/Student";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fields the student may view / edit on their own profile.
const EDITABLE = ["name", "contactNumber", "institutionName", "qualification", "gender", "dateOfBirth", "country", "address", "image"];

function serialize(s) {
  return {
    id: (s._id && s._id.toString()) || s.id,
    name: s.name || "",
    email: s.email || "",
    contactNumber: s.contactNumber || "",
    institutionName: s.institutionName || "",
    qualification: s.qualification || "",
    gender: s.gender || "",
    dateOfBirth: s.dateOfBirth || "",
    country: s.country || "",
    address: s.address || "",
    image: s.image || "",
    subscriptionType: s.subscriptionType || "B2C",
  };
}

// GET /api/student/profile — the signed-in student's own profile.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();
  const s = useMock
    ? mockStudents().find((x) => ((x._id && x._id.toString()) || x.id) === auth.id)
    : await Student.findById(auth.id).select("-password").lean().catch(() => null);
  if (!s) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json({ profile: serialize(s) });
}

// PUT /api/student/profile — update the editable fields. Email is not editable.
export async function PUT(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  let update = {};
  for (const k of EDITABLE) {
    if (body[k] !== undefined) update[k] = typeof body[k] === "string" ? body[k].trim() : body[k];
  }
  if (update.name !== undefined && !update.name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  // Offload a newly-uploaded base64 avatar to Cloudinary.
  update = await offloadMedia(update, { folder: "nuvosid/students" });

  const useMock = await resolveUseMock();
  if (useMock) {
    const s = mockStudents().find((x) => ((x._id && x._id.toString()) || x.id) === auth.id);
    if (!s) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    Object.assign(s, update);
    return NextResponse.json({ success: true, profile: serialize(s) });
  }

  const s = await Student.findByIdAndUpdate(auth.id, { $set: update }, { new: true }).select("-password").lean().catch(() => null);
  if (!s) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json({ success: true, profile: serialize(s) });
}
