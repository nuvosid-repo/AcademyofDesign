import { NextResponse } from "next/server";
import { resolveUseMock, mockBanners } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Banner from "@/models/Banner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/student/banners — active banners uploaded from the admin Banner master.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();
  // Only status/id — the image streams from /api/public/banners/:id/image.
  const docs = useMock
    ? mockBanners()
    : await Banner.find().select("status").sort({ createdAt: -1 }).lean();

  const banners = docs
    .filter((b) => (b.status || "Active") !== "Inactive")
    .map((b) => {
      const id = (b._id && b._id.toString()) || b.id;
      return { id, image: `/api/public/banners/${id}/image/` };
    });

  return NextResponse.json({ banners });
}
