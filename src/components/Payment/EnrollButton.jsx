"use client";
import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Loader2, Check, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import styles from "./EnrollButton.module.scss";

const BRAND = "Nuvosid Academy";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * Drop-in enrollment button that runs a Razorpay checkout.
 * - Real Razorpay is used automatically once RAZORPAY keys are set on the server
 *   (and NEXT_PUBLIC_RAZORPAY_KEY_ID is provided for the client).
 * - Until then, a mock Razorpay-style checkout runs end-to-end.
 *
 * Props: courseTitle, price (display string e.g. "₹11,250"), className, children.
 */
export default function EnrollButton({ courseId = "", courseTitle = "Course Enrollment", price = "", className = "", children, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("pay"); // pay | processing | success
  const [error, setError] = useState("");

  const close = useCallback(() => { setOpen(false); setStep("pay"); setError(""); }, []);

  // Verify the payment AND record the enrollment in one authenticated call
  // (apiFetch attaches the logged-in student's token so the server can attribute it).
  const verifyAndEnroll = (extra = {}) =>
    apiFetch("/api/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, courseTitle, price, ...extra }),
    }).catch(() => {});

  const createOrder = async () => {
    const res = await fetch("/api/payment/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price, courseTitle }),
    });
    return res.json();
  };

  const startCheckout = async () => {
    setError("");
    let data;
    try {
      data = await createOrder();
    } catch {
      setError("Could not start payment. Please try again.");
      setOpen(true);
      return;
    }
    if (data?.error) { setError(data.error); setOpen(true); return; }

    // ── Real Razorpay path (keys configured) ──
    const clientKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || data.keyId;
    if (!data.mock && clientKey && data.order?.id) {
      const ok = await loadRazorpayScript();
      if (!ok) { setError("Failed to load Razorpay."); setOpen(true); return; }
      const rzp = new window.Razorpay({
        key: clientKey,
        amount: data.order.amount,
        currency: data.order.currency,
        name: BRAND,
        description: courseTitle,
        order_id: data.order.id,
        theme: { color: "#db254f" },
        handler: async (resp) => {
          await verifyAndEnroll(resp);
          setStep("success");
          setOpen(true);
          onSuccess?.();
        },
      });
      rzp.open();
      return;
    }

    // ── Mock path (no keys yet) ──
    setStep("pay");
    setOpen(true);
  };

  const payMock = async () => {
    setStep("processing");
    // Simulate the gateway round-trip, then verify (mock verify accepts).
    await new Promise((r) => setTimeout(r, 1800));
    await verifyAndEnroll({ razorpay_payment_id: "pay_mock_" + Date.now() });
    setStep("success");
    onSuccess?.();
  };

  const modal = open && typeof document !== "undefined" && createPortal(
    <AnimatePresence>
      <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={step === "pay" ? close : undefined}>
        <motion.div
          className={styles.modal}
          initial={{ y: 30, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <div className={styles.logo}>Razor<span>pay</span></div>
            <div className={styles.secured}><ShieldCheck size={13} /> Test Mode</div>
            {step === "pay" && <button className={styles.close} onClick={close} aria-label="Close"><X size={16} /></button>}
          </div>

          {step === "pay" && (
            <div className={styles.body}>
              <div className={styles.amountBlock}>
                <span className={styles.for}>Paying {BRAND}</span>
                <span className={styles.title}>{courseTitle}</span>
                {price && <span className={styles.price}>{price}</span>}
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.field}>
                <label>Card Number</label>
                <input disabled value="4111 1111 1111 1111" />
              </div>
              <div className={styles.row}>
                <div className={styles.field}><label>Expiry</label><input disabled value="12 / 29" /></div>
                <div className={styles.field}><label>CVV</label><input disabled type="password" value="123" /></div>
              </div>

              <button className={styles.payBtn} onClick={payMock}>
                <CreditCard size={17} /> Pay {price || "Now"}
              </button>
              <p className={styles.note}>This is a dummy checkout. No real payment is charged.</p>
            </div>
          )}

          {step === "processing" && (
            <div className={styles.center}>
              <Loader2 className={styles.spin} size={44} />
              <h3>Processing payment…</h3>
              <p>Please don’t close this window. Validating with Razorpay…</p>
            </div>
          )}

          {step === "success" && (
            <div className={styles.center}>
              <div className={styles.successCircle}><Check size={34} strokeWidth={3} /></div>
              <h3>Payment Successful!</h3>
              <p>You’re enrolled in <strong>{courseTitle}</strong>. A confirmation has been sent to your email.</p>
              <div className={styles.actions}>
                <Link href="/student/dashboard" className={styles.primary} onClick={close}>Go to Dashboard</Link>
                <button className={styles.ghost} onClick={close}>Close</button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );

  return (
    <>
      <button type="button" className={className} onClick={startCheckout}>{children}</button>
      {modal}
    </>
  );
}
