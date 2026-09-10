import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses, mockEnrollments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/student/courses/:id/progress — mark a lecture as completed for the
// signed-in student. Body: { classIndex, videoIndex }. Powers progressive
// (drip) unlocking of later videos, classes and quizzes. Returns the full,
// deduped completedVideos list so the client can recompute lock state.
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const classIndex = Number(body.classIndex);
  const videoIndex = Number(body.videoIndex);
  if (!Number.isInteger(classIndex) || !Number.isInteger(videoIndex)) {
    return NextResponse.json({ error: "classIndex and videoIndex are required" }, { status: 400 });
  }
  const key = `${classIndex}:${videoIndex}`;

  const useMock = await resolveUseMock();
  const course = useMock
    ? mockCourses().find((c) => ((c._id && c._id.toString()) || c.id) === id)
    : await Course.findById(id).select("title").lean().catch(() => null);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const cid = (course._id && course._id.toString()) || course.id;

  if (useMock) {
    const store = mockEnrollments();
    const e = store.find((x) => x.studentId === auth.id && (x.courseId === cid || (x.courseTitle && x.courseTitle === course.title)));
    if (!e) return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
    e.completedVideos = Array.from(new Set([...(e.completedVideos || []), key]));
    return NextResponse.json({ completedVideos: e.completedVideos });
  }

  const e = await Enrollment.findOne({ studentId: auth.id, $or: [{ courseId: cid }, { courseTitle: course.title }] });
  if (!e) return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
  const set = new Set([...(e.completedVideos || []), key]);
  e.completedVideos = Array.from(set);
  await e.save();
  return NextResponse.json({ completedVideos: e.completedVideos });
}
