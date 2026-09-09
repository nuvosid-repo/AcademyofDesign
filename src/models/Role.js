import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Role name is required"], trim: true },
  // { moduleKey: ["Add", "View", ...] }
  permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Role || mongoose.model("Role", RoleSchema);
