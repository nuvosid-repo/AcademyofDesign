import mongoose from "mongoose";

// One enrollment = a student purchasing/joining a course. Created after a
// successful (mock or real) payment. Admin course list counts these per course.
const EnrollmentSchema = new mongoose.Schema({
  courseId: { type: String, default: "" },
  courseTitle: { type: String, default: "" },
  studentId: { type: String, default: "" },
  studentName: { type: String, default: "" },
  studentEmail: { type: String, default: "" },
  amount: { type: Number, default: 0 }, // paise
  paymentId: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Enrollment || mongoose.model("Enrollment", EnrollmentSchema);
