import { NextResponse } from "next/server";
import { resolveUseMock, mockCourses } from "@/lib/db";
import { serveImage } from "@/lib/img";
import Course from "@/models/Course";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/courses/:id/image — a course's thumbnail (or banner) streamed
// as a cached binary. Public marketing image (same shown on the website), so no
// auth. Keeps base64 out of course-list JSON responses.
export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const preferBanner = searchParams.get("type") === "banner";

  const useMock = await resolveUseMock();
  const primary = preferBanner ? "banner" : "thumbnail";
  const fallback = preferBanner ? "thumbnail" : "banner";

  let src;
  if (useMock) {
    const c = mockCourses().find((x) => ((x._id && x._id.toString()) || x.id) === id);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    src = c[primary] || c[fallback];
  } else {
    // Fetch only the field we need (avoids pulling the other large base64 blob).
    const c = await Course.findById(id).select(primary).lean().catch(() => null);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    src = c[primary];
    if (!src) {
      const c2 = await Course.findById(id).select(fallback).lean().catch(() => null);
      src = c2?.[fallback];
    }
  }
  if (!src) return NextResponse.json({ error: "No image" }, { status: 404 });

  // Thumbnails render small; banner mode a bit wider.
  return serveImage(src, { width: preferBanner ? 1400 : 700, quality: 78 });
}
