import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses, mockEnrollments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { isEnrollmentActive } from "@/lib/enrollment";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/student/courses/:id — course content (classes, videos, materials,
// quizzes) for an ENROLLED student. Heavy base64 (banner/thumbnail/material
// files) is NOT sent here — it streams on demand from the /image and /material
// endpoints so the page loads fast. Quiz correct answers are never sent.
export async function GET(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const useMock = await resolveUseMock();
  const course = useMock
    ? mockCourses().find((c) => ((c._id && c._id.toString()) || c.id) === id)
    : await Course.findById(id).select("-banner -thumbnail -classes.materials.data -materials.data").lean().catch(() => null);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const cid = (course._id && course._id.toString()) || course.id;

  // Enrollment gate
  const enrollments = useMock
    ? mockEnrollments().filter((e) => e.studentId === auth.id)
    : await Enrollment.find({ studentId: auth.id }).lean();
  const myEnroll = enrollments.find((e) => e.courseId === cid || (e.courseTitle && e.courseTitle === course.title));
  if (!myEnroll) return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
  if (!isEnrollmentActive(myEnroll)) return NextResponse.json({ error: "Your access to this course has expired. Please renew to continue." }, { status: 403 });
  const completedVideos = Array.isArray(myEnroll.completedVideos) ? myEnroll.completedVideos : [];

  const base = `/api/student/courses/${cid}`;

  // The student's latest score per quiz (assessmentId = `${cid}:${quizIndex}`).
  const resultDocs = useMock
    ? mockAssessmentResults().filter((r) => r.studentId === auth.id && (r.assessmentId || "").startsWith(`${cid}:`))
    : await AssessmentResult.find({ studentId: auth.id, assessmentId: { $regex: `^${cid}:` } }).sort({ createdAt: -1 }).lean();
  const latestByAid = {};
  for (const r of resultDocs) { if (!latestByAid[r.assessmentId]) latestByAid[r.assessmentId] = r; }

  // Normalize curriculum (support legacy flat videos/materials).
  const rawClasses = course.classes && course.classes.length
    ? course.classes
    : ((course.videos?.length || course.materials?.length)
        ? [{ type: "class", name: "Class 1", videos: course.videos || [], materials: course.materials || [] }]
        : []);

  const curriculum = rawClasses.map((c, index) => {
    if (c.type === "quiz") {
      const r = latestByAid[`${cid}:${index}`];
      return {
        type: "quiz",
        index,
        name: c.name || `Quiz ${index + 1}`,
        questionCount: (c.questions || []).length,
        questions: (c.questions || []).map((q) => ({ question: q.question || "", options: q.options || [] })),
        lastResult: r ? { score: r.score || 0, total: r.total || 0, percentage: r.percentage || 0, passed: !!r.passed } : null,
      };
    }
    if (c.type === "written" || c.type === "interview") {
      const r = latestByAid[`${cid}:${index}`];
      const qs = (c.markedQuestions || []).map((q) => ({ question: q.question || "", maxMarks: Number(q.maxMarks) || 0 }));
      return {
        type: c.type,
        index,
        name: c.name || (c.type === "interview" ? `AI Interview ${index + 1}` : `Written Exam ${index + 1}`),
        questionCount: qs.length,
        totalMarks: qs.reduce((n, q) => n + q.maxMarks, 0),
        // Interview questions are spoken aloud by the AI, so we send the text to
        // the attempt page; written questions are shown for typed answers.
        questions: qs,
        lastResult: r ? { score: r.score || 0, total: r.total || 0, percentage: r.percentage || 0, passed: !!r.passed, breakdown: r.breakdown || [] } : null,
      };
    }
    return {
      type: "class",
      index,
      name: c.name || `Class ${index + 1}`,
      videos: (c.videos || []).map((v) => ({ title: v.title || "", url: v.url || "", description: v.description || "" })),
      // materials carry metadata + a stream URL; the file itself loads on click.
      materials: (c.materials || [])
        .map((m, j) => ({ name: m.name || "", fileName: m.fileName || "", type: m.type || "", j }))
        .filter((m) => m.fileName || m.name)
        .map((m) => ({ name: m.name, fileName: m.fileName, type: m.type, url: `${base}/material/?ci=${index}&mi=${m.j}` })),
      // The 3D model HTML itself loads only when previewed (see /model route);
      // here we just flag whether this class has one.
      has3dModel: !!((c.model3dHtml || "").trim()),
    };
  });

  return NextResponse.json({
    course: {
      id: cid,
      title: course.title,
      category: course.category || "",
      description: course.shortDescription || course.overview || course.description || "",
      overview: course.overview || "",
      // Public (no-auth) image endpoint so the browser <img> always loads it —
      // prefers the uploaded banner, falls back to the thumbnail.
      image: `/api/public/courses/${cid}/image/?type=banner`,
      instructors: course.instructors || (course.instructor ? [course.instructor] : []),
      duration: course.duration || "",
      lessons: course.lessons || "",
    },
    curriculum,
    progress: { completedVideos },
  });
}
