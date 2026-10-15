import mongoose from "mongoose";

const EduSchema = new mongoose.Schema(
  { school: { type: String, default: "" }, degree: { type: String, default: "" }, year: { type: String, default: "" } },
  { _id: false }
);
const ExpSchema = new mongoose.Schema(
  { company: { type: String, default: "" }, role: { type: String, default: "" }, period: { type: String, default: "" }, details: { type: String, default: "" } },
  { _id: false }
);

// One resume per student (built in the student portal "Build Your Resume" page).
// Saved copies also appear in the admin Resume list.
const ResumeSchema = new mongoose.Schema({
  studentId: { type: String, default: "", index: true },
  studentName: { type: String, default: "" }, // account name
  studentEmail: { type: String, default: "" }, // account email

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
