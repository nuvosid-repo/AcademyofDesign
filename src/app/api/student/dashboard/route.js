import { NextResponse } from "next/server";
import { resolveUseMock, mockEnrollments, mockCourses, mockLiveClasses, mockAssessments, mockAssessmentResults, mockStudents } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Student from "@/models/Student";
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

  // Current name from the DB (not the token) so admin / profile name edits show.
  const me = useMock
    ? mockStudents().find((x) => ((x._id && x._id.toString()) || x.id) === auth.id)
    : await Student.findById(auth.id).select("name").lean().catch(() => null);
  const studentName = me?.name || auth.name || "Student";

  const courseIds = new Set(enrollments.map((e) => e.courseId).filter(Boolean));
  const courseTitles = new Set(enrollments.map((e) => e.courseTitle).filter(Boolean));
  // Titles of courses that still exist. A deleted course can leave behind
  // enrollments and quiz/assessment results (orphans) — we use this to drop
  // their scores so the dashboard never shows a course that no longer exists.
  const existingCourseTitles = new Set(allCourses.map((c) => c.title).filter(Boolean));

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

  // Today's date in IST (YYYY-MM-DD) so date comparisons are correct for India
  // regardless of the server's timezone. A live class whose date is in the past
  // is hidden from the dashboard; undated classes are kept.
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const notPast = (l) => !l.date || l.date >= todayIST;

  // Upcoming live classes for enrolled courses (past-dated ones are dropped)
  const liveClasses = allLive
    .filter((l) => isActive(l) && inEnrolled(l.course) && notPast(l))
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
    // Skip scores for a course that no longer exists (orphaned result rows).
    if (r.course && !existingCourseTitles.has(r.course)) continue;
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
      // Combined-assessment sub-scores (shown separately on the dashboard).
      mcqDone: !!r.mcqDone, mcqScore: r.mcqScore || 0, mcqTotal: r.mcqTotal || 0, mcqPercentage: r.mcqPercentage || 0,
      writtenGraded: !!r.writtenGraded, writtenScore: r.writtenScore || 0, writtenTotal: r.writtenTotal || 0, writtenSubmitted: !!r.writtenSubmitted,
      interviewGraded: !!r.interviewGraded, interviewScore: r.interviewScore || 0, interviewTotal: r.interviewTotal || 0,
      createdAt: r.createdAt,
    });
  }
  // Average across quiz percentages (assessment sub-scores are shown separately).
  const quizPct = results.filter((r) => r.type !== "Assessment").map((r) => r.percentage || 0);
  const avgScore = quizPct.length ? Math.round(quizPct.reduce((n, p) => n + p, 0) / quizPct.length) : 0;

  return NextResponse.json({
    student: { name: studentName },
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
