import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: [true, "Category name is required"], trim: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Category || mongoose.model("Category", CategorySchema);
