import mongoose from "mongoose";

// ── Flat mirror sub-docs (kept for the admin list + back-compat with the
//    original resume schema). The rich structured resume lives in `data`. ──
const EduSchema = new mongoose.Schema(
  { school: { type: String, default: "" }, degree: { type: String, default: "" }, year: { type: String, default: "" } },
  { _id: false }
);
const ExpSchema = new mongoose.Schema(
  { company: { type: String, default: "" }, role: { type: String, default: "" }, period: { type: String, default: "" }, details: { type: String, default: "" } },
  { _id: false }
);

// A submitted snapshot kept for version history / "compare with previous".
const VersionSchema = new mongoose.Schema(
  {
    versionId: { type: String, default: "" },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // ResumeData snapshot
    score: { type: Number, default: 0 },
    status: { type: String, default: "SUBMITTED" }, // SUBMITTED | CHANGES_REQUESTED | APPROVED
    submittedAt: { type: Date, default: Date.now },
    reviewerId: { type: String, default: "" },
    reviewerName: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    note: { type: String, default: "" }, // reviewer's overall note
  },
  { _id: false }
);

// A faculty comment pinned to a section (and optionally an item within it).
const CommentSchema = new mongoose.Schema(
  {
    commentId: { type: String, default: "" },
    versionId: { type: String, default: "" },
    sectionKey: { type: String, default: "" }, // e.g. "projects", "basics"
    itemId: { type: String, default: "" },     // optional id of the item commented on
    authorId: { type: String, default: "" },
    authorName: { type: String, default: "" },
    authorRole: { type: String, default: "admin" }, // admin | student
    body: { type: String, default: "" },
    resolved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// One resume per student (built in the student portal). Saved copies also appear
// in the admin Resume list, where faculty review & grade them.
const ResumeSchema = new mongoose.Schema({
  studentId: { type: String, default: "", index: true },
  studentName: { type: String, default: "" }, // account name
  studentEmail: { type: String, default: "" }, // account email

  // ── Rich structured resume (ResumeData — see lib/resume/schema.js) ──
  data: { type: mongoose.Schema.Types.Mixed, default: null },
  discipline: { type: String, default: "" },
  template: { type: String, default: "minimal" },
  accentColor: { type: String, default: "#db254f" },
  targetRole: { type: String, default: "" },
  readinessScore: { type: Number, default: 0 },

  // ── Review workflow ──
  status: { type: String, default: "DRAFT" }, // DRAFT | SUBMITTED | CHANGES_REQUESTED | APPROVED
  reviewNote: { type: String, default: "" },
  reviewerId: { type: String, default: "" },
  reviewerName: { type: String, default: "" },
  reviewedAt: { type: Date, default: null },
  submittedAt: { type: Date, default: null },
  versions: { type: [VersionSchema], default: [] },
  comments: { type: [CommentSchema], default: [] },

  // ── Public share link ──
  isPublic: { type: Boolean, default: false },
  publicSlug: { type: String, default: "", index: true },

  // ── Flat mirror fields (admin list + legacy) ──
  name: { type: String, default: "" },
  title: { type: String, default: "" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  summary: { type: String, default: "" },
  education: { type: [EduSchema], default: [] },
  experience: { type: [ExpSchema], default: [] },
  skills: { type: String, default: "" },

  completed: { type: Boolean, default: false }, // all key sections filled
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

if (mongoose.models.Resume) delete mongoose.models.Resume;
export default mongoose.model("Resume", ResumeSchema);
