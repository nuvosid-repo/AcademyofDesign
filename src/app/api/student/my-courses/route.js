import { NextResponse } from "next/server";
import { resolveUseMock, mockEnrollments, mockCourses, mockStudents } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { isEnrollmentActive, enrollmentExpiry } from "@/lib/enrollment";
import Enrollment from "@/models/Enrollment";
import Course from "@/models/Course";
import Student from "@/models/Student";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A student is "B2B" when their subscription is B2B (older records: "Corporate").
const isB2BStudent = (t) => t === "B2B" || t === "Corporate";
// A course is B2B-only when its subscription type is "B2B".
const isB2BCourse = (c) => (c.subscriptionType || "B2C") === "B2B";

function card(c, id) {
  return {
    id,
    title: c.title,
    category: c.category || "",
    description: c.shortDescription || c.overview || c.description || "",
    duration: c.duration || "",
    level: c.level || "",
    // Lightweight streamed thumbnail URL (no base64 in the list JSON).
    image: `/api/public/courses/${id}/image/`,
    price: c.price || "",
  };
}

// GET /api/student/my-courses — the student's enrolled courses PLUS all other
// active courses to explore & purchase.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();
  const [enrollments, allCourses, student] = useMock
    ? [
        mockEnrollments().filter((e) => e.studentId === auth.id),
        mockCourses(),
        mockStudents().find((s) => ((s._id && s._id.toString()) || s.id) === auth.id) || null,
      ]
    : await Promise.all([
        Enrollment.find({ studentId: auth.id }).lean(),
        // Only light fields — exclude all heavy base64 (banner/thumbnail/materials).
        Course.find().select("title category shortDescription overview description duration level price status subscriptionType").lean(),
        Student.findById(auth.id).select("subscriptionType").lean().catch(() => null),
      ]);

  const studentB2B = isB2BStudent(student?.subscriptionType);

  // Only non-expired enrollments grant access; expired ones fall back to Explore
  // so the student can re-purchase.
  const activeEnrollments = enrollments.filter((e) => isEnrollmentActive(e));
  const ids = new Set(activeEnrollments.map((e) => e.courseId).filter(Boolean));
  const titles = new Set(activeEnrollments.map((e) => e.courseTitle).filter(Boolean));
  const enrollByCourse = {}; const enrollByTitle = {};
  for (const e of activeEnrollments) { if (e.courseId) enrollByCourse[e.courseId] = e; if (e.courseTitle) enrollByTitle[e.courseTitle] = e; }

  const withId = allCourses.map((c) => ({ c, id: (c._id && c._id.toString()) || c.id }));
  const isEnrolled = ({ c, id }) => ids.has(id) || titles.has(c.title);
  const isActive = ({ c }) => (c.status || "Active") !== "Inactive";
  // B2B courses are visible only to B2B students; B2C courses are visible to all.
  const canSee = ({ c }) => studentB2B || !isB2BCourse(c);

  const enrolled = withId.filter(isEnrolled).map(({ c, id }) => {
    const e = enrollByCourse[id] || enrollByTitle[c.title];
    return { ...card(c, id), expiresAt: e ? enrollmentExpiry(e).toISOString() : null };
  });
  const explore = withId.filter((x) => !isEnrolled(x) && isActive(x) && canSee(x)).map(({ c, id }) => card(c, id));

  return NextResponse.json({ enrolled, explore });
}
