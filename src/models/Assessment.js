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

// An assessment attached to a course. Completing all of a course's assessments
// (one MCQ + one Live Interview) makes the student eligible for the certificate.
const AssessmentSchema = new mongoose.Schema({
  title: { type: String, required: [true, "Please provide a title"], trim: true },
  course: { type: String, default: "" }, // course title
  type: { type: String, enum: ["MCQ", "Live Interview"], default: "MCQ" },
  description: { type: String, default: "" },

  // MCQ assessment
  questions: { type: [QuestionSchema], default: [] },
  passingScore: { type: Number, default: 0 }, // % needed to pass

  // Live Interview assessment
  interviewDate: { type: String, default: "" }, // yyyy-mm-dd
  interviewTime: { type: String, default: "" }, // HH:mm
  interviewLink: { type: String, default: "" },
  interviewer: { type: String, default: "" },

  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Assessment || mongoose.model("Assessment", AssessmentSchema);
