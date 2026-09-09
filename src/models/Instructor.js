import mongoose from "mongoose";

// A rich detail section on the mentor page: a paragraph, or a list of tags /
// bullet points.
const DetailSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    variant: { type: String, enum: ["paragraph", "tags", "bullets"], default: "paragraph" },
    content: { type: String, default: "" }, // used when variant = paragraph
    items: { type: [String], default: [] },  // used when variant = tags | bullets
  },
  { _id: false }
);

const InstructorSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Name is required"], trim: true },
  role: { type: String, default: "" },        // short role shown on cards
  designation: { type: String, required: [true, "Designation is required"], trim: true },
  url: { type: String, default: "", trim: true },
  image: { type: String, default: "" }, // data URL (uploaded) or remote URL

  // Rich detail-page fields
  bio: { type: String, default: "" },
  education: { type: String, default: "" },
  experience: { type: String, default: "" },
  videoUrl: { type: String, default: "" },
  videoCaption: { type: String, default: "" },
  credentials: { type: [String], default: [] },
  memberships: { type: [String], default: [] },
  expertise: { type: [String], default: [] },
  details: { type: [DetailSchema], default: [] },

  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

// Drop any previously-compiled model so schema changes take effect on dev
// hot-reload (Next.js otherwise keeps the old compiled model).
if (mongoose.models.Instructor) delete mongoose.models.Instructor;

export default mongoose.model("Instructor", InstructorSchema);
