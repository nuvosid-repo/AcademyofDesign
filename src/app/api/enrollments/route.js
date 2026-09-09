import { NextResponse } from "next/server";
import { resolveUseMock, mockEnrollments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(e) {
  return {
    id: (e._id && e._id.toString()) || e.id,
    courseId: e.courseId || "",
    courseTitle: e.courseTitle || "",
    studentId: e.studentId || "",
    studentName: e.studentName || "",
    studentEmail: e.studentEmail || "",
    amount: e.amount || 0,
    paymentId: e.paymentId || "",
    createdAt: e.createdAt,
  };
}

// GET /api/enrollments — admin only. Lists all enrollments.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ enrollments: mockEnrollments().map(serialize) });

  const docs = await Enrollment.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ enrollments: docs.map(serialize) });
}

// POST /api/enrollments — records an enrollment after a successful payment.
// The student is attached from the auth token when logged in (optional).
export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const auth = await getAuthUser(request); // may be null (guest checkout)

  const doc = {
    courseId: (b.courseId || "").toString().trim(),
    courseTitle: (b.courseTitle || "").toString().trim(),
    studentId: auth?.id || auth?._id?.toString() || "",
    studentName: auth?.name || b.studentName || "",
    studentEmail: auth?.email || b.studentEmail || "",
    amount: Number(b.amount) || 0,
    paymentId: (b.paymentId || "").toString(),
  };
  if (!doc.courseId && !doc.courseTitle) {
    return NextResponse.json({ error: "Course is required" }, { status: 400 });
  }

  const useMock = await resolveUseMock();
  if (useMock) {
    const created = { _id: "en_" + Date.now(), ...doc, createdAt: new Date() };
    mockEnrollments().unshift(created);
    return NextResponse.json({ success: true, enrollment: serialize(created) }, { status: 201 });
  }

  const created = await Enrollment.create(doc);
  return NextResponse.json({ success: true, enrollment: serialize(created) }, { status: 201 });
}
