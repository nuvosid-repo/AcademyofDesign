import { NextResponse } from "next/server";
import { resolveUseMock, mockInstructors } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Instructor from "@/models/Instructor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(i) {
  return {
    id: (i._id && i._id.toString()) || i.id,
    name: i.name,
    designation: i.designation,
    url: i.url || "",
    image: i.image || "",
    status: i.status || "Active",
    createdAt: i.createdAt,
  };
}

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
  const name = (b.name || "").trim();
  const designation = (b.designation || "").trim();
  if (!name || !designation) {
    return NextResponse.json({ error: "Name and designation are required" }, { status: 400 });
  }
  const doc = {
    name, designation,
    url: (b.url || "").trim(),
    image: b.image || "",
    status: b.status === "Inactive" ? "Inactive" : "Active",
  };

  const useMock = await resolveUseMock();
  if (useMock) {
    const created = { _id: "i_" + Date.now(), ...doc, createdAt: new Date() };
    mockInstructors().unshift(created);
    return NextResponse.json({ success: true, instructor: serialize(created) }, { status: 201 });
  }

  const created = await Instructor.create(doc);
  return NextResponse.json({ success: true, instructor: serialize(created) }, { status: 201 });
}
