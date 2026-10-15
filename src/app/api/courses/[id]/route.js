import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Course from "@/models/Course";

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
  const patch = {};
  for (const f of FIELDS) if (b[f] != null) patch[f] = b[f];

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
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }

  await Course.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
