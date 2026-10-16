import { NextResponse } from "next/server";
import { resolveUseMock, mockBanners } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { uploadDataUrl } from "@/lib/cloudinary";
import Banner from "@/models/Banner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request) {
  const auth = await getAuthUser(request);
  if (!auth) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (auth.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { auth };
}

export async function PUT(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  if (b.image != null) b.image = await uploadDataUrl(b.image, { folder: "nuvosid/banners" });

  const useMock = await resolveUseMock();
  if (useMock) {
    const item = mockBanners().find((x) => x._id === id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (b.status != null) item.status = b.status;
    if (b.image != null) item.image = b.image;
    return NextResponse.json({ success: true });
  }
  await Banner.findByIdAndUpdate(id, {
    ...(b.status != null ? { status: b.status } : {}),
    ...(b.image != null ? { image: b.image } : {}),
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;
  const { id } = await params;

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockBanners();
    const idx = store.findIndex((x) => x._id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    store.splice(idx, 1);
    return NextResponse.json({ success: true });
  }
  await Banner.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
