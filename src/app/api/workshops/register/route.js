import { NextResponse } from "next/server";
import { resolveUseMock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import WorkshopRegistration from "@/models/WorkshopRegistration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "₹2,999" / "2,999.00" → integer paise.
function toPaise(price) {
  const n = Number(String(price ?? "").replace(/[^\d.]/g, "")) || 0;
  return Math.round(n * 100);
}

const mockStore = () => (globalThis.__mockRegistrations ||= []);

// POST /api/workshops/register — create a registration (payment still Pending).
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, phone, interest, country, designation, workshopId, workshopTitle, price } = body;

    if (!name || !email || !phone || !interest || !country || !designation || !workshopId || !workshopTitle) {
      return NextResponse.json({ error: "Please provide all required fields" }, { status: 400 });
    }

    const auth = await getAuthUser(request).catch(() => null);
    const doc = {
      name, email, phone, interest, country, designation, workshopId, workshopTitle,
      price: (price || "").toString(), amount: toPaise(price), currency: "INR",
      paymentStatus: "Pending", studentId: auth?.id || "",
    };

    const useMock = await resolveUseMock();
    if (useMock) {
      const registration = { _id: "mock_" + Math.random().toString(36).slice(2, 11), ...doc, createdAt: new Date() };
      mockStore().push(registration);
      return NextResponse.json({ success: true, message: "Registration created", data: registration });
    }

    const registration = await WorkshopRegistration.create(doc);
    return NextResponse.json({ success: true, message: "Registration created", data: registration });
  } catch (error) {
    console.error("Error in workshop registration:", error);
    return NextResponse.json({ error: error.message || "Server error during registration" }, { status: 500 });
  }
}

// PATCH /api/workshops/register — mark a registration paid after checkout.
// Body: { id, transactionId, paymentId?, orderId?, price?, status? }
export async function PATCH(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Registration id required" }, { status: 400 });

    const paid = (body.status || "Paid") === "Paid";
    const patch = {
      paymentStatus: paid ? "Paid" : "Failed",
      transactionId: (body.transactionId || "").toString(),
      paymentId: (body.paymentId || "").toString(),
      orderId: (body.orderId || "").toString(),
      paidAt: paid ? new Date() : null,
      updatedAt: new Date(),
    };
    if (body.price != null) { patch.price = body.price.toString(); patch.amount = toPaise(body.price); }

    const useMock = await resolveUseMock();
    if (useMock) {
      const reg = mockStore().find((r) => r._id === id);
      if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
      Object.assign(reg, patch);
      return NextResponse.json({ success: true, data: reg });
    }

    const reg = await WorkshopRegistration.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: reg });
  } catch (error) {
    console.error("Error confirming workshop payment:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
