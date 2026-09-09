import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: [true, "Title is required"], trim: true },
  url: { type: String, required: [true, "URL is required"], trim: true },
  courseId: { type: String, default: "" },
  course: { type: String, default: "" }, // course title (for display)
  description: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Video || mongoose.model("Video", VideoSchema);
