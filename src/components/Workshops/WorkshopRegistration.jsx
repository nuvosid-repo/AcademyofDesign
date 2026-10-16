"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import styles from "./Workshops.module.scss";

export default function WorkshopRegistration({ workshop }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    interest: "",
    country: "🇮🇳 India",
    designation: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState("pay"); // pay, processing, success
  const [registeredData, setRegisteredData] = useState(null);
  const [transactionId, setTransactionId] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Phone/contact fields: digits only, max 10.
    const next = (name === "phone" || name === "contactNumber")
      ? value.replace(/\D/g, "").slice(0, 10)
      : value;
    setFormData({ ...formData, [name]: next });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.designation) {
      setError("Please select a Designation");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiFetch("/api/workshops/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          workshopId: workshop.id,
          workshopTitle: workshop.title,
          price: workshop.price,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process registration");
      }

      const mockTxn = "TXN" + Math.floor(10000000 + Math.random() * 90000000);
      setTransactionId(mockTxn);
      setRegisteredData(data.data || formData);

      setIsSubmitting(false);
      setShowPaymentModal(true);
      setPaymentStep("pay");
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleMockPayment = async () => {
    setPaymentStep("processing");
    // Record the payment on the server so it appears as "Paid" in the admin panel.
    try {
      const regId = registeredData?._id;
      if (regId) {
        await apiFetch("/api/workshops/register", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: regId, transactionId, price: workshop.price, status: "Paid" }),
        });
      }
    } catch { /* payment is mock — don't block the user if recording hiccups */ }
    setPaymentStep("success");
  };

  const handleCloseSuccess = () => {
    setShowPaymentModal(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      interest: "",
      country: "🇮🇳 India",
      designation: "",
    });
    setPaymentStep("pay");
  };

  return (
    <>
      <div id="register" className={styles.registrationBlock}>
        <h3>Secure Your Spot</h3>
        <p>Register for a premium seat today. Complete the registration form to proceed with payment validation.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className={styles.glossyForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" required value={formData.name} onChange={handleInputChange} placeholder="e.g. Tanishq Shrivastava" />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="phone">Phone No.</label>
            <input type="tel" id="phone" name="phone" inputMode="numeric" maxLength={10} required value={formData.phone} onChange={handleInputChange} placeholder="10-digit mobile number" />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder="e.g. yourname@domain.com" />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="interest">Interest</label>
            <input type="text" id="interest" name="interest" required value={formData.interest} onChange={handleInputChange} placeholder="e.g. AutoCAD drafting, UI/UX" />
          </div>

          <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
            <label htmlFor="country">Country</label>
            <select id="country" name="country" value={formData.country} onChange={handleInputChange} required>
              <option value="🇮🇳 India">🇮🇳 &nbsp; India</option>
              <option value="🇺🇸 United States">🇺🇸 &nbsp; United States</option>
              <option value="🇬🇧 United Kingdom">🇬🇧 &nbsp; United Kingdom</option>
              <option value="🇦🇪 United Arab Emirates">🇦🇪 &nbsp; United Arab Emirates</option>
              <option value="🇨🇦 Canada">🇨🇦 &nbsp; Canada</option>
              <option value="🇸🇬 Singapore">🇸🇬 &nbsp; Singapore</option>
              <option value="🇦🇺 Australia">🇦🇺 &nbsp; Australia</option>
              <option value="🇩🇪 Germany">🇩🇪 &nbsp; Germany</option>
            </select>
          </div>

          <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
            <label htmlFor="designation">Designation</label>
            <select id="designation" name="designation" value={formData.designation} onChange={handleInputChange} required>
              <option value="" disabled>Select your Designation</option>
              <option value="Student">Student</option>
              <option value="Architect">Architect</option>
              <option value="Interior Designer">Interior Designer</option>
              <option value="Civil Engineer">Civil Engineer</option>
              <option value="Working Professional">Working Professional</option>
              <option value="Freelancer">Freelancer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <button type="submit" disabled={isSubmitting} className={`${styles.submitBtn} ${styles.fullWidth}`}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>PROCESSING REGISTRATION...</span>
              </>
            ) : (
              <span>REGISTER EVENT &amp; RESERVE SEAT</span>
            )}
          </button>
        </form>
      </div>

      {/* Mock Razorpay Payment Modal Overlay */}
      {showPaymentModal && (
        <div className={styles.paymentModalOverlay}>
          <div className={styles.paymentModal}>
            {paymentStep === "pay" && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col h-full">
                <div className={styles.rzpHeader}>
                  <div className={styles.rzpLogo}>Razor<span>pay</span></div>
                  <span className={styles.rzpSecured}>Secured Checkout</span>
                </div>

                <div className={styles.rzpAmountBlock}>
                  <div className={styles.rzpFor}>Registration Fee for</div>
                  <div className={styles.rzpTitle}>{workshop.title}</div>
                  <div className={styles.rzpPrice}>{workshop.price}</div>
                </div>

                <div className={styles.rzpForm}>
                  <div className="flex flex-col gap-4">
                    <div className={styles.inputGroup}>
                      <label>Dummy Card Details</label>
                      <input type="text" disabled value="4111 •••• •••• 1111" className="bg-black/40 border-white/5 text-gray-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={styles.inputGroup}>
                        <label>Expiry Date</label>
                        <input type="text" disabled value="12 / 29" className="bg-black/40 border-white/5 text-gray-400 text-center" />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>CVV</label>
                        <input type="password" disabled value="•••" className="bg-black/40 border-white/5 text-gray-400 text-center" />
                      </div>
                    </div>
                  </div>

                  <button onClick={handleMockPayment} className={styles.rzpPayBtn}>
                    <CreditCard size={18} />
                    <span>Complete Payment ({workshop.price})</span>
                  </button>

                  <button onClick={() => setShowPaymentModal(false)} className={styles.rzpCancelBtn}>
                    Cancel Transaction
                  </button>
                </div>
              </motion.div>
            )}

            {paymentStep === "processing" && (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center min-h-[400px]">
                <Loader2 className="animate-spin text-blue-500 mb-6" size={48} />
                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--fg)" }}>Processing Transaction</h3>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                  Please do not close this window or click back. We are validating your payment details with Razorpay servers...
                </p>
              </div>
            )}

            {paymentStep === "success" && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.receiptState}>
                <div className={styles.successCircle}>
                  <Check size={36} />
                </div>
                <h3>Seat Confirmed!</h3>
                <p className={styles.successMessage}>
                  Your payment has been successfully captured by Razorpay. An entry ticket and workshop manual have been sent to your email.
                </p>

                <div className={styles.receiptCard}>
                  <div className={styles.receiptRow}>
                    <span className={styles.label}>Attendee Name</span>
                    <span className={styles.value}>{registeredData?.name}</span>
                  </div>
                  <div className={styles.receiptRow}>
                    <span className={styles.label}>Workshop</span>
                    <span className={styles.value}>{workshop.title.split("Masterclass")[0]}</span>
                  </div>
                  <div className={styles.receiptRow}>
                    <span className={styles.label}>Amount Paid</span>
                    <span className={`${styles.value} ${styles.highlight}`}>{workshop.price}</span>
                  </div>
                  <div className={styles.receiptRow}>
                    <span className={styles.label}>Transaction ID</span>
                    <span className="font-mono text-xs text-gray-300">{transactionId}</span>
                  </div>
                  <div className={styles.receiptRow}>
                    <span className={styles.label}>Speaker</span>
                    <span className={styles.value}>{workshop.speaker.name}</span>
                  </div>
                  <div className={styles.receiptRow}>
                    <span className={styles.label}>Date / Time</span>
                    <span className={styles.value}>{workshop.date}</span>
                  </div>
                </div>

                <button onClick={handleCloseSuccess} className={styles.closeBtn}>
                  Close Receipt
                </button>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
