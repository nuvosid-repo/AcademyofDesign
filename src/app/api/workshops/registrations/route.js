import { NextResponse } from "next/server";
import { resolveUseMock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import WorkshopRegistration from "@/models/WorkshopRegistration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(r) {
  return {
    id: (r._id && r._id.toString()) || r.id,
    name: r.name || "", email: r.email || "", phone: r.phone || "",
    interest: r.interest || "", country: r.country || "", designation: r.designation || "",
    workshopId: r.workshopId || "", workshopTitle: r.workshopTitle || "",
    price: r.price || "", amount: r.amount || 0, currency: r.currency || "INR",
    paymentStatus: r.paymentStatus || "Pending",
    transactionId: r.transactionId || "", paymentId: r.paymentId || "", orderId: r.orderId || "",
    paidAt: r.paidAt || null, studentId: r.studentId || "",
    createdAt: r.createdAt || null,
  };
}

// GET /api/workshops/registrations — admin: every workshop registration with its
// billing/payment details. Includes a summary for the stat tiles.
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();
  const docs = useMock
    ? [...(globalThis.__mockRegistrations || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : await WorkshopRegistration.find().sort({ createdAt: -1 }).lean();

  const registrations = docs.map(serialize);
  const paid = registrations.filter((r) => r.paymentStatus === "Paid");
  const summary = {
    total: registrations.length,
    paid: paid.length,
    pending: registrations.filter((r) => r.paymentStatus === "Pending").length,
    revenue: paid.reduce((n, r) => n + (r.amount || 0), 0), // paise
  };

  return NextResponse.json({ registrations, summary });
}
