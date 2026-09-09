import { NextResponse } from "next/server";
import { resolveUseMock, mockInstructors } from "@/lib/db";
import { serveImage } from "@/lib/img";
import Instructor from "@/models/Instructor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/instructors/:id/image — instructor photo (WebP + cached for
// uploads; redirect for remote URLs). Keeps base64 out of the list JSON.
export async function GET(_request, { params }) {
  const { id } = await params;
  const useMock = await resolveUseMock();
  const doc = useMock
    ? mockInstructors().find((x) => ((x._id && x._id.toString()) || x.id) === id)
    : await Instructor.findById(id).select("image").lean().catch(() => null);
  if (!doc || !doc.image) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return serveImage(doc.image, { width: 600, quality: 82 });
}
