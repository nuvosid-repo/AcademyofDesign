import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  courseId: { type: String, default: "" },
  course: { type: String, default: "" }, // course title (for display)
  message: { type: String, required: [true, "Message is required"], trim: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
