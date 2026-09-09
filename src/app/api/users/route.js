import { NextResponse } from "next/server";
import { resolveUseMock, mockAdminUsers } from "@/lib/db";
import { getAuthUser, bcrypt } from "@/lib/auth";
import AdminUser from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(u) {
  return {
    id: (u._id && u._id.toString()) || u.id,
    name: u.name,
    email: u.email,
    contactNo: u.contactNo || "",
    role: u.role || "",
    username: u.username,
    status: u.status || "Active",
    createdAt: u.createdAt,
  };
}

// GET /api/users — admin only. Lists panel users (no passwords).
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ users: mockAdminUsers().map(serialize) });

  const docs = await AdminUser.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ users: docs.map(serialize) });
}

// POST /api/users — admin only. Creates a panel user.
export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const name = (b.name || "").trim();
  const email = (b.email || "").trim().toLowerCase();
  const username = (b.username || "").trim();
  const password = b.password || "";
  if (!name || !email || !username || !password) {
    return NextResponse.json({ error: "Name, email, username and password are required" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));
  const doc = {
    name, email, username,
    contactNo: (b.contactNo || "").trim(),
    role: (b.role || "").trim(),
    status: b.status === "Inactive" ? "Inactive" : "Active",
    password: hashed,
  };

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockAdminUsers();
    if (store.some((u) => u.email === email || u.username === username)) {
      return NextResponse.json({ error: "A user with this email or username already exists" }, { status: 400 });
    }
    const created = { _id: "au_" + Date.now(), ...doc, createdAt: new Date() };
    store.unshift(created);
    return NextResponse.json({ success: true, user: serialize(created) }, { status: 201 });
  }

  const created = await AdminUser.create(doc);
  return NextResponse.json({ success: true, user: serialize(created) }, { status: 201 });
}
