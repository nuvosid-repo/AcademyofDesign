import { NextResponse } from "next/server";
import crypto from "crypto";
import { resolveUseMock, mockEnrollments } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPaise(price) {
  const n = Number(String(price ?? "").replace(/[^\d.]/g, "")) || 0;
  return Math.round(n * 100);
}

// POST /api/payment/verify
// Verifies a Razorpay payment signature (real HMAC when keys exist, mock accepts
// the dummy payment) AND records the enrollment for the logged-in student.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, courseTitle, price } = body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  // ── Real signature verification ──
  if (secret && razorpay_signature) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expected !== razorpay_signature) {
      return NextResponse.json({ verified: false, error: "Signature mismatch" }, { status: 400 });
    }
  }

  // ── Record the enrollment (attaches the student from the auth token) ──
  const auth = await getAuthUser(request);
  const doc = {
    courseId: (courseId || "").toString().trim(),
    courseTitle: (courseTitle || "").toString().trim(),
    studentId: auth?.id || "",
    studentName: auth?.name || "",
    studentEmail: body.studentEmail || "",
    amount: toPaise(price),
    paymentId: (razorpay_payment_id || "").toString(),
  };

  if (doc.courseId || doc.courseTitle) {
    try {
      const useMock = await resolveUseMock();
      if (useMock) {
        const store = mockEnrollments();
        const dupe = doc.studentId && store.some((e) => e.studentId === doc.studentId && (e.courseId === doc.courseId || e.courseTitle === doc.courseTitle));
        if (!dupe) store.unshift({ _id: "en_" + Date.now(), ...doc, createdAt: new Date() });
      } else {
        const query = doc.studentId
          ? { studentId: doc.studentId, $or: [{ courseId: doc.courseId }, { courseTitle: doc.courseTitle }] }
          : null;
        const exists = query ? await Enrollment.findOne(query) : null;
        if (!exists) await Enrollment.create(doc);
      }
    } catch (e) {
      // Don't fail the payment response if recording hiccups; log for debugging.
      console.error("Enrollment record error:", e?.message);
    }
  }

  return NextResponse.json({ verified: true });
}
