import mongoose from "mongoose";

// A workshop/event registration submitted from the public website form, plus the
// billing/payment details captured at checkout. Shown to admins so they can see
// who registered and what they paid.
const WorkshopRegistrationSchema = new mongoose.Schema({
  // ── Attendee (who submitted the form) ──
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email address"],
  },
  phone: { type: String, required: true, trim: true },
  interest: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  designation: { type: String, required: true, trim: true },

  // ── Workshop ──
  workshopId: { type: String, required: true, trim: true },
  workshopTitle: { type: String, required: true, trim: true },

  // ── Billing / payment ──
  price: { type: String, default: "" },        // display price, e.g. "₹2,999"
  amount: { type: Number, default: 0 },         // in paise
  currency: { type: String, default: "INR" },
  paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
  transactionId: { type: String, default: "" }, // shown on the receipt
  orderId: { type: String, default: "" },        // Razorpay order id (when live)
  paymentId: { type: String, default: "" },      // Razorpay payment id (when live)
  paidAt: { type: Date, default: null },

  // ── Link to a logged-in student (if the submitter was signed in) ──
  studentId: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

if (mongoose.models.WorkshopRegistration) delete mongoose.models.WorkshopRegistration;
export default mongoose.model("WorkshopRegistration", WorkshopRegistrationSchema);
