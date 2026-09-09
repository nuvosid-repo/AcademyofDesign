import { NextResponse } from "next/server";
import { resolveUseMock, mockInstructors } from "@/lib/db";
import Instructor from "@/models/Instructor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Card fields for the website instructor grids. `slug`/`img` mirror the static
// data shape so the existing cards render unchanged.
const card = (i) => {
  const id = (i._id && i._id.toString()) || i.id;
  // Plain URLs pass through; uploaded base64 is streamed via the image endpoint.
  const image = !i.image ? "" : (i.image.startsWith("data:") ? `/api/public/instructors/${id}/image/` : i.image);
  return {
    id,
    slug: id,
    name: i.name || "",
    role: i.role || i.designation || "",
    designation: i.designation || "",
    image,
    img: image,
    education: i.education || "",
    experience: i.experience || "",
    credentials: i.credentials || [],
  };
};

// GET /api/public/instructors — active instructors for the website.
export async function GET() {
  const useMock = await resolveUseMock();
  if (useMock) {
    const list = mockInstructors().filter((i) => (i.status || "Active") === "Active");
    return NextResponse.json({ instructors: list.map(card) });
  }
  const docs = await Instructor.find({ status: "Active" }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ instructors: docs.map(card) });
}
