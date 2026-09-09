import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema({
  image: { type: String, default: "" }, // data URL (uploaded) or remote URL
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Banner || mongoose.model("Banner", BannerSchema);
