import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses, mockEnrollments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/student/courses/:id/material?ci=&mi= — download one study material for
// an enrolled student. Streams the file so it isn't part of the page-load JSON.
export async function GET(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const ci = parseInt(searchParams.get("ci") ?? "-1", 10);
  const mi = parseInt(searchParams.get("mi") ?? "-1", 10);

  const useMock = await resolveUseMock();
  const course = useMock
    ? mockCourses().find((c) => ((c._id && c._id.toString()) || c.id) === id)
    : await Course.findById(id).lean().catch(() => null);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cid = (course._id && course._id.toString()) || course.id;

  const enrollments = useMock
    ? mockEnrollments().filter((e) => e.studentId === auth.id)
    : await Enrollment.find({ studentId: auth.id }).lean();
  const enrolled = enrollments.some((e) => e.courseId === cid || (e.courseTitle && e.courseTitle === course.title));
  if (!enrolled) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cls = (course.classes && course.classes.length) ? course.classes[ci] : { materials: course.materials || [] };
  const mat = cls?.materials?.[mi];
  if (!mat || !mat.data) return NextResponse.json({ error: "Material not found" }, { status: 404 });

  // The file may be stored inline (legacy base64 data URL) or as a Cloudinary
  // URL. Either way we stream the bytes back with the content-type we recorded,
  // so the browser renders PDFs inline and keeps the viewer CORS-free.
  let buf, srcType;
  const m = /^data:([^;]+);base64,(.*)$/s.exec(mat.data);
  if (m) {
    buf = Buffer.from(m[2], "base64");
    srcType = m[1];
  } else {
    const r = await fetch(mat.data).catch(() => null);
    if (!r || !r.ok) return NextResponse.json({ error: "Material unavailable" }, { status: 502 });
    buf = Buffer.from(await r.arrayBuffer());
    srcType = r.headers.get("content-type") || "";
  }
  const fname = (mat.fileName || mat.name || "file").replace(/"/g, "");

  // Only Excel/CSV spreadsheets are downloadable; everything else is view-only
  // (served inline so it opens in the browser rather than downloading).
  const typeStr = (mat.type || srcType || "").toLowerCase();
  const isExcel = /\.(xlsx?|csv)$/i.test(fname) || typeStr.includes("spreadsheet") || typeStr.includes("excel") || typeStr === "text/csv";
  const disposition = isExcel ? `attachment; filename="${fname}"` : `inline; filename="${fname}"`;

  return new Response(buf, {
    headers: {
      "Content-Type": mat.type || srcType || "application/octet-stream",
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
