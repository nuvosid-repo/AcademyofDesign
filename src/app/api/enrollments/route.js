import { NextResponse } from "next/server";
import { resolveUseMock, mockEnrollments, mockCourses } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { oneYearFromNow, courseEndExpiry } from "@/lib/enrollment";
import Enrollment from "@/models/Enrollment";
import Course from "@/models/Course";

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
  // Only surface enrollments whose course still exists — a deleted course can
  // leave orphan enrollment rows that should no longer appear anywhere.
  if (useMock) {
    const titles = new Set(mockCourses().map((c) => c.title).filter(Boolean));
    const ids = new Set(mockCourses().map((c) => (c._id && c._id.toString()) || c.id).filter(Boolean));
    const live = mockEnrollments().filter((e) => (e.courseTitle && titles.has(e.courseTitle)) || (e.courseId && ids.has(String(e.courseId))));
    return NextResponse.json({ enrollments: live.map(serialize) });
  }

  const [docs, courses] = await Promise.all([
    Enrollment.find().sort({ createdAt: -1 }).lean(),
    Course.find().select("title").lean(),
  ]);
  const titles = new Set(courses.map((c) => c.title).filter(Boolean));
  const ids = new Set(courses.map((c) => c._id.toString()));
  const live = docs.filter((e) => (e.courseTitle && titles.has(e.courseTitle)) || (e.courseId && ids.has(String(e.courseId))));
  return NextResponse.json({ enrollments: live.map(serialize) });
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
    expiresAt: oneYearFromNow(),
  };
  if (!doc.courseId && !doc.courseTitle) {
    return NextResponse.json({ error: "Course is required" }, { status: 400 });
  }

  const useMock = await resolveUseMock();
  // Course end date (if set by admin) caps access; else 1 year.
  const course = useMock
    ? mockCourses().find((c) => ((c._id && c._id.toString()) || c.id) === doc.courseId || c.title === doc.courseTitle)
    : (doc.courseId ? await Course.findById(doc.courseId).select("endDate").lean().catch(() => null) : null)
      || (doc.courseTitle ? await Course.findOne({ title: doc.courseTitle }).select("endDate").lean().catch(() => null) : null);
  doc.expiresAt = courseEndExpiry(course);
  if (useMock) {
    const created = { _id: "en_" + Date.now(), ...doc, createdAt: new Date() };
    mockEnrollments().unshift(created);
    return NextResponse.json({ success: true, enrollment: serialize(created) }, { status: 201 });
  }

  const created = await Enrollment.create(doc);
  return NextResponse.json({ success: true, enrollment: serialize(created) }, { status: 201 });
}
