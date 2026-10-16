import { NextResponse } from "next/server";
import { resolveUseMock, mockInstructors } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeInstructor as serialize, buildInstructorDoc } from "@/lib/instructorFields";
import { offloadMedia } from "@/lib/cloudinary";
import Instructor from "@/models/Instructor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ instructors: mockInstructors().map(serialize) });

  const docs = await Instructor.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ instructors: docs.map(serialize) });
}

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const doc = await offloadMedia(buildInstructorDoc(b), { folder: "nuvosid/instructors" });
  if (!doc.name || !doc.designation) {
    return NextResponse.json({ error: "Name and designation are required" }, { status: 400 });
  }

  const useMock = await resolveUseMock();
  if (useMock) {
    const created = { _id: "i_" + Date.now(), ...doc, createdAt: new Date() };
    mockInstructors().unshift(created);
    return NextResponse.json({ success: true, instructor: serialize(created) }, { status: 201 });
  }

  const created = await Instructor.create(doc);
  return NextResponse.json({ success: true, instructor: serialize(created) }, { status: 201 });
}
