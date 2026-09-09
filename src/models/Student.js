import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Name is required"], trim: true },
  email: { type: String, required: [true, "Email is required"], lowercase: true, trim: true },
  dateOfBirth: { type: String, default: "" },
  gender: { type: String, default: "" },
  image: { type: String, default: "" }, // data URL
  contactNumber: { type: String, default: "", trim: true },
  qualification: { type: String, default: "" },
  institutionName: { type: String, default: "", trim: true },
  country: { type: String, default: "" },
  address: { type: String, default: "", trim: true },
  identityProof: { type: String, default: "" }, // data URL
  subscriptionType: { type: String, default: "B2C" }, // B2C | B2B
  password: { type: String, required: [true, "Password is required"] },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

// Drop any previously-compiled model so schema changes take effect on dev
// hot-reload (Next.js otherwise keeps the old compiled model).
if (mongoose.models.Student) delete mongoose.models.Student;

export default mongoose.model("Student", StudentSchema);
