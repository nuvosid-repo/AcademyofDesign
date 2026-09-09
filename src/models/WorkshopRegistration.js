import mongoose from "mongoose";

const WorkshopRegistrationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email address",
    ],
  },
  phone: { type: String, required: true, trim: true },
  interest: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  designation: { type: String, required: true, trim: true },
  workshopId: { type: String, required: true, trim: true },
  workshopTitle: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.WorkshopRegistration ||
  mongoose.model("WorkshopRegistration", WorkshopRegistrationSchema);
