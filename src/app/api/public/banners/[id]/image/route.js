import { NextResponse } from "next/server";
import { resolveUseMock, mockBanners } from "@/lib/db";
import { serveImage } from "@/lib/img";
import Banner from "@/models/Banner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/banners/:id/image — banner image, resized + WebP + cached.
export async function GET(request, { params }) {
  const { id } = await params;

  const useMock = await resolveUseMock();
  const banner = useMock
    ? mockBanners().find((b) => ((b._id && b._id.toString()) || b.id) === id)
    : await Banner.findById(id).select("image").lean().catch(() => null);
  if (!banner || !banner.image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return serveImage(banner.image, { width: 1400, quality: 80 });
}
