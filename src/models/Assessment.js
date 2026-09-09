import mongoose from "mongoose";

// One MCQ question: text, options, and index of the correct option.
const QuestionSchema = new mongoose.Schema(
  {
    question: { type: String, default: "" },
    options: { type: [String], default: [] },
    correctIndex: { type: Number, default: 0 },
  },
  { _id: false }
);

// A manually-marked question (written exam / interview): text + max marks.
const MarkedQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, default: "" },
    maxMarks: { type: Number, default: 10 },
  },
  { _id: false }
);

// An assessment attached to a course. It can combine up to three sections:
// MCQ (auto-scored), Written / return exam (admin-graded), and Live Interview
// (interviewer-graded). Completing them contributes to the student's score.
const AssessmentSchema = new mongoose.Schema({
  title: { type: String, required: [true, "Please provide a title"], trim: true },
  course: { type: String, default: "" }, // course title
  description: { type: String, default: "" },
  type: { type: String, default: "MCQ" }, // legacy; the combined flow uses the flags below

  // ── MCQ section (auto-scored) ──
  mcqEnabled: { type: Boolean, default: false },
  questions: { type: [QuestionSchema], default: [] }, // MCQ questions
  passingScore: { type: Number, default: 0 }, // % needed to pass

  // ── Written / return exam section (admin-graded) ──
  writtenEnabled: { type: Boolean, default: false },
  writtenQuestions: { type: [MarkedQuestionSchema], default: [] },

  // ── Live Interview section (interviewer-graded) ──
  interviewEnabled: { type: Boolean, default: false },
  interviewDate: { type: String, default: "" }, // yyyy-mm-dd
  interviewTime: { type: String, default: "" }, // HH:mm
  interviewLink: { type: String, default: "" },
  interviewer: { type: String, default: "" },
  interviewQuestions: { type: [MarkedQuestionSchema], default: [] },

  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

// Drop any previously-compiled model so schema changes take effect on dev
// hot-reload (Next.js otherwise keeps the old compiled model).
if (mongoose.models.Assessment) delete mongoose.models.Assessment;

export default mongoose.model("Assessment", AssessmentSchema);
