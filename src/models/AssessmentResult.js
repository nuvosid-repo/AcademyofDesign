import mongoose from "mongoose";

// A student's score for one attempt of an MCQ assessment / quiz.
const AssessmentResultSchema = new mongoose.Schema({
  studentId: { type: String, default: "" },
  studentName: { type: String, default: "" },
  assessmentId: { type: String, default: "" },
  assessmentTitle: { type: String, default: "" },
  course: { type: String, default: "" },
  type: { type: String, default: "MCQ" }, // MCQ | Quiz
  score: { type: Number, default: 0 },     // correct answers
  total: { type: Number, default: 0 },     // total questions
  percentage: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.AssessmentResult || mongoose.model("AssessmentResult", AssessmentResultSchema);
