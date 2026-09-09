import { NextResponse } from "next/server";
import { resolveUseMock, mockCategories } from "@/lib/db";
import Category from "@/models/Category";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serialize = (c) => ({ id: (c._id && c._id.toString()) || c.id, name: c.name });

// GET /api/public/categories — active categories for the public website.
export async function GET() {
  const useMock = await resolveUseMock();
  if (useMock) {
    const list = mockCategories().filter((c) => (c.status || "Active") === "Active");
    return NextResponse.json({ categories: list.map(serialize) });
  }
  const docs = await Category.find({ status: "Active" }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ categories: docs.map(serialize) });
}
