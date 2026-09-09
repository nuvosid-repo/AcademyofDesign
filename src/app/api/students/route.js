import { NextResponse } from "next/server";
import { resolveUseMock, mockUsers } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/students — admin only. Lists all student accounts.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) {
    const students = mockUsers()
      .filter((u) => u.role === "student")
      .map((u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }));
    return NextResponse.json({ students });
  }

  const docs = await User.find({ role: "student" }).select("name email role createdAt").lean();
  const students = docs.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }));
  return NextResponse.json({ students });
}
