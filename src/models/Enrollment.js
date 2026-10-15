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
  // Progressive unlock: keys of completed videos, each `${classIndex}:${videoIndex}`.
  completedVideos: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  // Access expires one year after purchase (see src/lib/enrollment.js).
  expiresAt: { type: Date, default: null },
});

// Force a fresh schema on hot-reload so newly added fields (completedVideos)
// aren't silently stripped by a stale compiled model.
if (mongoose.models.Enrollment) delete mongoose.models.Enrollment;
export default mongoose.model("Enrollment", EnrollmentSchema);
