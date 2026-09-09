import { NextResponse } from "next/server";
import { resolveUseMock, mockCategories } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Category from "@/models/Category";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serialize = (c) => ({
  id: (c._id && c._id.toString()) || c.id,
  name: c.name,
  status: c.status || "Active",
  createdAt: c.createdAt,
});

// GET /api/categories — any authenticated user can list (course form needs it too).
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ categories: mockCategories().map(serialize) });
  const docs = await Category.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ categories: docs.map(serialize) });
}

// POST /api/categories — admin only.
export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const name = (b.name || "").trim();
  if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  const status = b.status === "Inactive" ? "Inactive" : "Active";

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockCategories();
    if (store.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 });
    }
    const created = { _id: "cat_" + Date.now(), name, status, createdAt: new Date() };
    store.unshift(created);
    return NextResponse.json({ success: true, category: serialize(created) }, { status: 201 });
  }
  const created = await Category.create({ name, status });
  return NextResponse.json({ success: true, category: serialize(created) }, { status: 201 });
}
