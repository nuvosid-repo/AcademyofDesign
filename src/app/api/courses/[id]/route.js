import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses, mockAssessments, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { offloadMedia } from "@/lib/cloudinary";
import Course from "@/models/Course";
import Assessment from "@/models/Assessment";
import AssessmentResult from "@/models/AssessmentResult";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELDS = [
  "title", "shortDescription", "instructor", "instructors", "price", "lessons", "duration",
  "enrolledTillDate", "startDate", "endDate", "thumbnail", "subscriptionType",
  "banner", "overview", "introVideo", "demoVideo", "classes", "videos", "materials", "status", "studentsEnrolled",
  "category", "level", "description",
];

// GET /api/courses/:id — full course (incl. banner/thumbnail/classes base64),
// used by the admin edit form. The list endpoint omits these for speed.
export async function GET(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const useMock = await resolveUseMock();
  const c = useMock
    ? mockCourses().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Course.findById(id).lean().catch(() => null);
  if (!c) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const ARR = ["classes", "videos", "materials", "instructors"];
  const course = { id: (c._id && c._id.toString()) || c.id, createdAt: c.createdAt };
  for (const f of FIELDS) course[f] = c[f] != null ? c[f] : (ARR.includes(f) ? [] : "");
  return NextResponse.json({ course });
}

// PUT /api/courses/:id — admin only. Updates a course.
export async function PUT(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  let patch = {};
  for (const f of FIELDS) if (b[f] != null) patch[f] = b[f];
  // Offload any newly-added base64 media to Cloudinary (already-stored URLs are
  // left untouched, so unchanged media is never re-uploaded).
  patch = await offloadMedia(patch, { folder: "nuvosid/courses" });

  const useMock = await resolveUseMock();
  if (useMock) {
    const c = mockCourses().find((x) => x._id === id);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    Object.assign(c, patch);
    return NextResponse.json({ success: true });
  }
  await Course.findByIdAndUpdate(id, patch);
  return NextResponse.json({ success: true });
}

// DELETE /api/courses/:id — admin only.
export async function DELETE(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockCourses();
    const idx = store.findIndex((c) => c._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [removed] = store.splice(idx, 1);
    // Cascade: drop this course's assessments + their results so nothing is
    // left orphaned (assessments reference the course by title).
    const title = removed?.title;
    if (title) {
      const aStore = mockAssessments();
      const deadIds = new Set(aStore.filter((a) => a.course === title).map((a) => (a._id || a.id)?.toString()));
      for (let i = aStore.length - 1; i >= 0; i--) if (aStore[i].course === title) aStore.splice(i, 1);
      const rStore = mockAssessmentResults();
      for (let i = rStore.length - 1; i >= 0; i--) if (deadIds.has(String(rStore[i].assessmentId)) || rStore[i].course === title) rStore.splice(i, 1);
    }
    return NextResponse.json({ success: true });
  }

  // Load the course first so we know its title, then cascade-delete everything
  // that references it — otherwise its assessments would be orphaned (they link
  // to the course by title) and keep showing up in the admin lists.
  const course = await Course.findById(id);
  const title = course?.title;
  await Course.findByIdAndDelete(id);
  if (title) {
    const assessments = await Assessment.find({ course: title }).select("_id").lean();
    const ids = assessments.map((a) => a._id.toString());
    await AssessmentResult.deleteMany({ $or: [{ assessmentId: { $in: ids } }, { course: title }] });
    await Assessment.deleteMany({ course: title });
    // Also drop enrollments for this course so students aren't left "enrolled"
    // in a course that no longer exists (which would show stale dashboard data).
    await Enrollment.deleteMany({ $or: [{ courseId: id }, { courseTitle: title }] });
  }
  return NextResponse.json({ success: true });
}
