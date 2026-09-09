import mongoose from "mongoose";

// Panel/admin users managed under Masters > User (distinct from the auth User
// model used for student/admin login).
const AdminUserSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Name is required"], trim: true },
  email: { type: String, required: [true, "Email is required"], lowercase: true, trim: true },
  contactNo: { type: String, default: "", trim: true },
  role: { type: String, default: "", trim: true }, // role name from the Role master
  username: { type: String, required: [true, "Username is required"], trim: true },
  password: { type: String, required: [true, "Password is required"] },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);
