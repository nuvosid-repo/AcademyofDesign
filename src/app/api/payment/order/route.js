import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Turn a display price like "₹24,999" or "11,250.00" into integer paise.
function toPaise(price) {
  const n = Number(String(price ?? "").replace(/[^\d.]/g, "")) || 0;
  return Math.round(n * 100);
}

// POST /api/payment/order
// Creates a Razorpay order. As soon as RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET
// are set in the environment, this automatically hits the real Razorpay API.
// Until then it returns a mock order so the checkout UI works end-to-end.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const paise = Number(body.amount) || toPaise(body.price);
  const courseTitle = body.courseTitle || "Course Enrollment";

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // A real order needs a positive amount; the mock flow can proceed without one.
  if (keyId && keySecret && paise <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // ── Real Razorpay (used automatically once keys exist) ──
  if (keyId && keySecret) {
    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paise,
          currency: "INR",
          receipt: "rcpt_" + Date.now(),
          notes: { courseTitle },
        }),
      });
      const order = await res.json();
      if (!res.ok) {
        return NextResponse.json({ error: order?.error?.description || "Order creation failed" }, { status: 500 });
      }
      return NextResponse.json({ mock: false, keyId, order });
    } catch (e) {
      return NextResponse.json({ error: "Payment gateway error" }, { status: 500 });
    }
  }

  // ── Mock order (no keys configured yet) ──
  const order = {
    id: "order_mock_" + Date.now(),
    amount: paise,
    currency: "INR",
    status: "created",
    notes: { courseTitle },
  };
  return NextResponse.json({ mock: true, keyId: null, order });
}
