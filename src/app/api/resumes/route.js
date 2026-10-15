import { NextResponse } from "next/server";
import { resolveUseMock, mockResumes, mockEnrollments, mockAssessments, mockAssessmentResults, mockCourses } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeResume } from "@/lib/resumeFields";
import { serializeAssessment, combinedResult } from "@/lib/assessmentFields";
import { courseVideoCount } from "@/lib/courseProgress";
import Resume from "@/models/Resume";
import Enrollment from "@/models/Enrollment";
import Assessment from "@/models/Assessment";
import AssessmentResult from "@/models/AssessmentResult";
import Course from "@/models/Course";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/resumes — admin: every student resume, enriched with their academy
// performance (completed courses, certificates, assessment scores) so the admin
// can shortlist high-scoring candidates for hiring.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  const [resumeDocs, enrollments, assessments, results, courses] = useMock
    ? [mockResumes(), mockEnrollments(), mockAssessments(), mockAssessmentResults(), mockCourses()]
    : await Promise.all([
        Resume.find().sort({ updatedAt: -1 }).lean(),
        Enrollment.find().lean(),
        Assessment.find().lean(),
        AssessmentResult.find().lean(),
        Course.find().select("title classes videos").lean(),
      ]);

  // Lookups
  const courseByKey = {}; // id & title -> { title, totalVideos, id }
  for (const c of courses) {
    const id = (c._id && c._id.toString()) || c.id;
    const rec = { id, title: c.title || "", totalVideos: courseVideoCount(c) };
    courseByKey[id] = rec;
    if (c.title) courseByKey[c.title] = rec;
  }
  const assessmentById = {};
  for (const a of assessments) assessmentById[(a._id && a._id.toString()) || a.id] = a;

  const out = resumeDocs.map((doc) => {
    const base = serializeResume(doc);
    const sid = base.studentId;

    // ── Courses the student is enrolled in + completion ──
    const myEnroll = enrollments.filter((e) => e.studentId === sid);
    const courseList = myEnroll.map((e) => {
      const rec = courseByKey[e.courseId] || courseByKey[e.courseTitle] || { title: e.courseTitle || "", totalVideos: 0, id: e.courseId };
      const done = Array.isArray(e.completedVideos) ? e.completedVideos.length : 0;
      const total = rec.totalVideos || 0;
      const completion = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : (done > 0 ? 100 : 0);
      const completed = total > 0 && done >= total;
      return { id: rec.id, title: rec.title, completion, completed, certificateUrl: completed ? `/certificate/${sid}__${rec.id}` : null };
    });
    const certificates = courseList.filter((c) => c.completed).map((c) => ({ course: c.title, url: c.certificateUrl }));

    // ── Assessment scores (combined across sections) ──
    const myResults = results.filter((r) => r.studentId === sid && r.type === "Assessment");
    const seen = new Set();
    const assessmentScores = [];
    for (const r of myResults) {
      if (seen.has(r.assessmentId)) continue;
      seen.add(r.assessmentId);
      const a = assessmentById[r.assessmentId];
      if (!a) continue;
      const s = serializeAssessment(a);
      const combined = combinedResult(s, r);
      assessmentScores.push({
        title: r.assessmentTitle || s.title, course: r.course || s.course,
        combinedPct: combined.percentage, combinedReady: combined.ready, passed: combined.passed,
        mcqDone: !!r.mcqDone, mcqPct: r.mcqPercentage || 0,
        writtenGraded: !!r.writtenGraded, writtenScore: r.writtenScore || 0, writtenTotal: r.writtenTotal || 0,
        interviewGraded: !!r.interviewGraded, interviewScore: r.interviewScore || 0, interviewTotal: r.interviewTotal || 0,
      });
    }
    // Top (best) combined % among fully-graded assessments — for sorting/shortlisting.
    const ready = assessmentScores.filter((a) => a.combinedReady);
    const topScore = ready.length ? Math.max(...ready.map((a) => a.combinedPct)) : null;

    return { ...base, courses: courseList, certificates, assessments: assessmentScores, topScore, completedCourses: courseList.filter((c) => c.completed).length };
  });

  return NextResponse.json({ resumes: out });
}
