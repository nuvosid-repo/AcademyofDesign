import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    url: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

// Course material (PDF / Excel / PPT etc.) stored as a base64 data URL.
const MaterialSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    fileName: { type: String, default: "" },
    type: { type: String, default: "" },
    data: { type: String, default: "" }, // data URL
  },
  { _id: false }
);

// A single quiz question: text, options, and the index of the correct option.
const QuizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, default: "" },
    options: { type: [String], default: [] },
    correctIndex: { type: Number, default: 0 },
  },
  { _id: false }
);

// A written / interview question graded out of maxMarks (AI-scored).
const MarkedQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, default: "" },
    maxMarks: { type: Number, default: 10 },
    modelAnswer: { type: String, default: "" }, // optional reference answer for better AI grading
  },
  { _id: false }
);

// A curriculum item inside a course. `type` distinguishes a normal class
// (videos + materials) from a quiz (MCQ), a written exam, or an AI interview —
// all taken inside the course. Existing records have no `type` and are treated
// as classes for backward compatibility.
const ClassSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["class", "quiz", "written", "interview"], default: "class" },
    name: { type: String, default: "" },
    videos: { type: [VideoSchema], default: [] },
    materials: { type: [MaterialSchema], default: [] },
    questions: { type: [QuizQuestionSchema], default: [] },        // MCQ (quiz)
    markedQuestions: { type: [MarkedQuestionSchema], default: [] }, // written / interview
    model3dHtml: { type: String, default: "" }, // admin-pasted HTML embed for a 3D model preview
  },
  { _id: false }
);

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: [true, "Please provide a course title"], trim: true },
  shortDescription: { type: String, default: "" },
  instructor: { type: String, default: "" }, // primary instructor name (Instructors master)
  instructors: { type: [String], default: [] }, // all teaching instructors (names)
  price: { type: String, default: "" },
  lessons: { type: String, default: "" },
  duration: { type: String, default: "" },
  expiryDays: { type: String, default: "" },
  enrolledTillDate: { type: String, default: "" },
  startDate: { type: String, default: "" }, // yyyy-mm-dd — course start
  endDate: { type: String, default: "" },   // yyyy-mm-dd — optional; blank = access expires 1 year after enrolment
  thumbnail: { type: String, default: "" }, // data URL
  websiteUrl: { type: String, default: "" },
  subscriptionType: { type: String, default: "B2C" }, // B2B | B2C
  banner: { type: String, default: "" }, // data URL
  overview: { type: String, default: "" },
  introVideo: { type: String, default: "" }, // intro video URL (course detail page)
  demoVideo: { type: String, default: "" },  // demo video URL (demo page)
  classes: { type: [ClassSchema], default: [] },
  // legacy flat lists (kept for backward compatibility)
  videos: { type: [VideoSchema], default: [] },
  materials: { type: [MaterialSchema], default: [] },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  studentsEnrolled: { type: Number, default: 0 },
  // legacy (kept optional for backward compatibility)
  category: { type: String, default: "" },
  level: { type: String, default: "" },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

// Drop any previously-compiled model so schema changes (e.g. class `type` /
// `questions` for quizzes) take effect on dev hot-reload — Next.js otherwise
// keeps the old compiled model and silently strips the new fields on save.
if (mongoose.models.Course) delete mongoose.models.Course;

export default mongoose.model("Course", CourseSchema);
