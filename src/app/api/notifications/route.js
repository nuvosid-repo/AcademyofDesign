import { NextResponse } from "next/server";
import { resolveUseMock, mockNotifications } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Notification from "@/models/Notification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serialize = (n) => ({
  id: (n._id && n._id.toString()) || n.id,
  courseId: n.courseId || "",
  course: n.course || "",
  message: n.message,
  createdAt: n.createdAt,
});

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  if (useMock) return NextResponse.json({ notifications: mockNotifications().map(serialize) });

  const docs = await Notification.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ notifications: docs.map(serialize) });
}

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const message = (b.message || "").trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  const doc = { courseId: b.courseId || "", course: (b.course || "").trim(), message };

  const useMock = await resolveUseMock();
  if (useMock) {
    const created = { _id: "n_" + Date.now(), ...doc, createdAt: new Date() };
    mockNotifications().unshift(created);
    return NextResponse.json({ success: true, notification: serialize(created) }, { status: 201 });
  }

  const created = await Notification.create(doc);
  return NextResponse.json({ success: true, notification: serialize(created) }, { status: 201 });
}
