import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses, mockEnrollments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELDS = [
  "title", "shortDescription", "instructor", "instructors", "price", "lessons", "duration",
  "enrolledTillDate", "thumbnail", "subscriptionType",
  "banner", "overview", "introVideo", "demoVideo", "classes", "videos", "materials", "status", "studentsEnrolled",
  "category", "level", "description",
];

function serialize(c) {
  return {
    id: (c._id && c._id.toString()) || c.id,
    title: c.title,
    shortDescription: c.shortDescription || "",
    instructor: c.instructor || "",
    instructors: c.instructors || [],
    price: c.price || "",
    lessons: c.lessons || "",
    duration: c.duration || "",
    enrolledTillDate: c.enrolledTillDate || "",
    thumbnail: c.thumbnail || "",
    subscriptionType: c.subscriptionType || "B2C",
    banner: c.banner || "",
    overview: c.overview || "",
    introVideo: c.introVideo || "",
    demoVideo: c.demoVideo || "",
    classes: c.classes || [],
    videos: c.videos || [],
    materials: c.materials || [],
    status: c.status || "Active",
    studentsEnrolled: c.studentsEnrolled || 0,
    category: c.category || "",
    level: c.level || "",
    description: c.description || "",
    createdAt: c.createdAt,
  };
}

function buildDoc(b) {
  const doc = {};
  for (const f of FIELDS) if (b[f] != null) doc[f] = b[f];
  return doc;
}

// GET /api/courses — any authenticated user can list courses.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();

  // Build enrollment counts keyed by courseId and courseTitle.
  const countEnrolled = (list, course) => {
    const byId = list.filter((e) => e.courseId && e.courseId === course.id).length;
    if (byId) return byId;
    return list.filter((e) => e.courseTitle && e.courseTitle === course.title).length;
  };

  if (useMock) {
    const enr = mockEnrollments();
    const courses = mockCourses().map((c) => {
      const s = serialize(c);
      s.enrolledCount = countEnrolled(enr, s);
      return s;
    });
    return NextResponse.json({ courses });
  }

  const docs = await Course.find().sort({ createdAt: -1 }).lean();
  const enr = await Enrollment.find().select("courseId courseTitle").lean();
  const courses = docs.map((c) => {
    const s = serialize(c);
    s.enrolledCount = countEnrolled(enr, s);
    return s;
  });
  return NextResponse.json({ courses });
}

// POST /api/courses — admin only. Creates a course.
export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  if (!b.title || !b.title.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  const doc = buildDoc(b);
  doc.title = b.title.trim();
  if (!doc.subscriptionType) doc.subscriptionType = "B2C";
  if (!doc.status) doc.status = "Active";

  const useMock = await resolveUseMock();
  if (useMock) {
    const created = { _id: "c_" + Date.now(), studentsEnrolled: 0, videos: [], ...doc, createdAt: new Date() };
    mockCourses().unshift(created);
    return NextResponse.json({ success: true, course: serialize(created) }, { status: 201 });
  }
  const created = await Course.create(doc);
  return NextResponse.json({ success: true, course: serialize(created) }, { status: 201 });
}
