import mongoose from "mongoose";

const SpeakerSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    designation: { type: String, default: "" },
    credentials: { type: String, default: "" },
    image: { type: String, default: "" }, // URL
    bio: { type: String, default: "" },
  },
  { _id: false }
);

const ScheduleSchema = new mongoose.Schema(
  { time: { type: String, default: "" }, activity: { type: String, default: "" } },
  { _id: false }
);

const WorkshopSchema = new mongoose.Schema({
  title: { type: String, required: [true, "Please provide a title"], trim: true },
  subtitle: { type: String, default: "" },
  category: { type: String, default: "" },
  date: { type: String, default: "" },      // yyyy-mm-dd
  startTime: { type: String, default: "" },  // HH:mm
  endTime: { type: String, default: "" },    // HH:mm
  time: { type: String, default: "" },       // legacy display string (fallback)
  location: { type: String, default: "" },
  price: { type: String, default: "" },
  originalPrice: { type: String, default: "" },
  image: { type: String, default: "" }, // URL
  videoUrl: { type: String, default: "" },
  videoCaption: { type: String, default: "" },
  speaker: { type: SpeakerSchema, default: () => ({}) },
  schedule: { type: [ScheduleSchema], default: [] },
  keynotes: { type: [String], default: [] },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

// Drop any previously-compiled model so schema changes take effect on dev
// hot-reload (Next.js otherwise keeps the old compiled model).
if (mongoose.models.Workshop) delete mongoose.models.Workshop;

export default mongoose.model("Workshop", WorkshopSchema);
