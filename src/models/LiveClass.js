import mongoose from "mongoose";

const LiveClassSchema = new mongoose.Schema({
  title: { type: String, required: [true, "Please provide a title"], trim: true },
  date: { type: String, default: "" }, // yyyy-mm-dd
  time: { type: String, default: "" }, // HH:mm
  type: { type: String, enum: ["Live Class", "Quiz"], default: "Live Class" },
  description: { type: String, default: "" },
  link: { type: String, default: "" }, // live class join link
  course: { type: String, default: "" }, // course title
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.LiveClass || mongoose.model("LiveClass", LiveClassSchema);
