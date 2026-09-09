import { NextResponse } from "next/server";
import { resolveUseMock, mockBanners } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Banner from "@/models/Banner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serialize = (b) => ({
  id: (b._id && b._id.toString()) || b.id,
  image: b.image || "",
  status: b.status || "Active",
  createdAt: b.createdAt,
});

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ banners: mockBanners().map(serialize) });

  const docs = await Banner.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ banners: docs.map(serialize) });
}

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  if (!b.image) return NextResponse.json({ error: "Please upload a banner image" }, { status: 400 });
  const doc = { image: b.image, status: b.status === "Inactive" ? "Inactive" : "Active" };

  const useMock = await resolveUseMock();
  if (useMock) {
    const created = { _id: "b_" + Date.now(), ...doc, createdAt: new Date() };
    mockBanners().unshift(created);
    return NextResponse.json({ success: true, banner: serialize(created) }, { status: 201 });
  }

  const created = await Banner.create(doc);
  return NextResponse.json({ success: true, banner: serialize(created) }, { status: 201 });
}
