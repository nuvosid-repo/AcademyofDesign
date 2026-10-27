import mongoose from "mongoose";

// One row per student per day: the active (non-idle) learning seconds that day.
// Time is accumulated server-side from heartbeats, with each heartbeat adding
// only the real elapsed delta (capped), so idle gaps never inflate the total.
const StudyTimeSchema = new mongoose.Schema({
  studentId: { type: String, default: "" },
  date: { type: String, default: "" }, // "YYYY-MM-DD" (IST)
  seconds: { type: Number, default: 0 },
  lastBeatAt: { type: Date, default: null }, // for delta capping between heartbeats
  updatedAt: { type: Date, default: Date.now },
});

StudyTimeSchema.index({ studentId: 1, date: 1 }, { unique: true });

export default mongoose.models.StudyTime || mongoose.model("StudyTime", StudyTimeSchema);
