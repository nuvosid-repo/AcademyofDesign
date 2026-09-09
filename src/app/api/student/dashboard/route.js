import { NextResponse } from "next/server";
import { resolveUseMock, mockEnrollments, mockCourses, mockLiveClasses, mockAssessments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Enrollment from "@/models/Enrollment";
import Course from "@/models/Course";
import LiveClass from "@/models/LiveClass";
import Assessment from "@/models/Assessment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/student/dashboard — real overview for the logged-in student, built
// from admin-managed data (enrollments, courses, live classes, assessments).
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();

  const [enrollments, allCourses, allLive, allAssess, allResults] = useMock
    ? [
        mockEnrollments().filter((e) => e.studentId === auth.id),
        mockCourses(),
        mockLiveClasses(),
        mockAssessments(),
        mockAssessmentResults().filter((r) => r.studentId === auth.id),
      ]
    : await Promise.all([
        Enrollment.find({ studentId: auth.id }).lean(),
        // Light fields only — no heavy base64 (banner/thumbnail/materials).
        Course.find().select("title category shortDescription overview description duration status").lean(),
        LiveClass.find().lean(),
        Assessment.find().lean(),
        AssessmentResult.find({ studentId: auth.id }).sort({ createdAt: -1 }).lean(),
      ]);

  const courseIds = new Set(enrollments.map((e) => e.courseId).filter(Boolean));
  const courseTitles = new Set(enrollments.map((e) => e.courseTitle).filter(Boolean));

  // Enrolled course cards
  const courses = allCourses
    .map((c) => ({ c, id: (c._id && c._id.toString()) || c.id }))
    .filter(({ c, id }) => courseIds.has(id) || courseTitles.has(c.title))
    .map(({ c, id }) => ({
      id,
      title: c.title,
      category: c.category || "",
      description: c.shortDescription || c.overview || c.description || "",
      duration: c.duration || "",
    }));

  const inEnrolled = (courseTitle) => courseTitle && courseTitles.has(courseTitle);
  const isActive = (x) => (x.status || "Active") !== "Inactive";

  // Upcoming live classes for enrolled courses
  const liveClasses = allLive
    .filter((l) => isActive(l) && inEnrolled(l.course))
    .map((l) => ({
      id: (l._id && l._id.toString()) || l.id,
      title: l.title,
      course: l.course || "",
      date: l.date || "",
      time: l.time || "",
      link: l.link || "",
    }))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  // Assessments for enrolled courses
  const assessments = allAssess
    .filter((a) => isActive(a) && inEnrolled(a.course))
    .map((a) => ({
      id: (a._id && a._id.toString()) || a.id,
      title: a.title,
      course: a.course || "",
      type: a.type || "MCQ",
    }));

  // Assessment / quiz scores — one score per quiz/assessment (latest kept).
  // allResults is sorted newest-first, so the first seen per key is the latest.
  const seen = new Set();
  const results = [];
  for (const r of allResults) {
    const key = r.assessmentId || (r._id && r._id.toString()) || r.id;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      id: (r._id && r._id.toString()) || r.id,
      assessmentTitle: r.assessmentTitle || "",
      course: r.course || "",
      type: r.type || "MCQ",
      score: r.score || 0,
      total: r.total || 0,
      percentage: r.percentage || 0,
      passed: !!r.passed,
      createdAt: r.createdAt,
    });
  }
  const avgScore = results.length
    ? Math.round(results.reduce((n, r) => n + (r.percentage || 0), 0) / results.length)
    : 0;

  return NextResponse.json({
    student: { name: auth.name || "Student" },
    stats: {
      enrolled: courses.length,
      liveClasses: liveClasses.length,
      assessments: assessments.length,
      certificates: 0, // wired up once the certificate flow is built
    },
    courses,
    liveClasses,
    assessments,
    results,
    avgScore,
  });
}
