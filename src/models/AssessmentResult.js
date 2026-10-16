import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema(
  { question: { type: String, default: "" }, answer: { type: String, default: "" } },
  { _id: false }
);

// One graded question: question text, max marks, and awarded marks.
const GradeSchema = new mongoose.Schema(
  {
    question: { type: String, default: "" },
    maxMarks: { type: Number, default: 0 },
    marks: { type: Number, default: 0 },
    feedback: { type: String, default: "" }, // AI (or admin) justification for the marks
    gradedBy: { type: String, default: "" },  // "ai" | "admin"
    answer: { type: String, default: "" },    // transcript of the candidate's spoken answer (interview)
  },
  { _id: false }
);

// A student's result for one assessment — holds the MCQ (auto), Written
// (admin-graded) and Interview (interviewer-graded) scores separately.
// Also used by course quizzes (type "Quiz") which only fill the MCQ fields.
const AssessmentResultSchema = new mongoose.Schema({
  studentId: { type: String, default: "" },
  studentName: { type: String, default: "" },
  assessmentId: { type: String, default: "" },
  assessmentTitle: { type: String, default: "" },
  course: { type: String, default: "" },
  type: { type: String, default: "MCQ" }, // "MCQ" | "Quiz" | "Assessment"

  // Progressive attempts: 1 = Set A, 2 = Set B (retry after failing the MCQ).
  attempt: { type: Number, default: 1 },
  examSet: { type: String, default: "A" }, // "A" | "B"

  // ── MCQ (auto-scored) — legacy score/total/percentage kept for quizzes ──
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  mcqScore: { type: Number, default: 0 },
  mcqTotal: { type: Number, default: 0 },
  mcqPercentage: { type: Number, default: 0 },
  mcqDone: { type: Boolean, default: false },

  // ── Written / return exam ──
  writtenAnswers: { type: [AnswerSchema], default: [] }, // student submission
  writtenSubmitted: { type: Boolean, default: false },
  writtenBreakdown: { type: [GradeSchema], default: [] }, // admin grading
  writtenScore: { type: Number, default: 0 },
  writtenTotal: { type: Number, default: 0 },
  writtenGraded: { type: Boolean, default: false },

  // ── Live Interview ──
  interviewBreakdown: { type: [GradeSchema], default: [] }, // interviewer grading
  interviewScore: { type: Number, default: 0 },
  interviewTotal: { type: Number, default: 0 },
  interviewGraded: { type: Boolean, default: false },
  interviewVideoUrl: { type: String, default: "" }, // Cloudinary URL of the recorded session

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

if (mongoose.models.AssessmentResult) delete mongoose.models.AssessmentResult;

export default mongoose.model("AssessmentResult", AssessmentResultSchema);
