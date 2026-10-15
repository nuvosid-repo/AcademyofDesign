import { NextResponse } from "next/server";
import { resolveUseMock, mockStudents, mockCourses, mockEnrollments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Student from "@/models/Student";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/stats — lightweight dashboard tiles. Computes counts & revenue
// server-side (countDocuments + aggregation) instead of shipping full lists.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) {
    const enr = mockEnrollments();
    return NextResponse.json({
      students: mockStudents().length,
      courses: mockCourses().length,
      revenue: enr.reduce((n, e) => n + (Number(e.amount) || 0), 0),
      txns: enr.length,
    });
  }

  const [students, courses, agg] = await Promise.all([
    Student.countDocuments(),
    Course.countDocuments(),
    Enrollment.aggregate([{ $group: { _id: null, revenue: { $sum: "$amount" }, txns: { $sum: 1 } } }]),
  ]);
  const { revenue = 0, txns = 0 } = agg[0] || {};
  return NextResponse.json({ students, courses, revenue, txns });
}
