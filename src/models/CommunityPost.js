import mongoose from "mongoose";

// A community answer (comment) on a question. Embedded in the post so a thread
// loads in one read. authorName is a snapshot taken when it was written.
const CommentSchema = new mongoose.Schema(
  {
    authorId: { type: String, default: "" },
    authorName: { type: String, default: "Student" },
    body: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// A community question posted by a student. Other students answer via comments.
const CommunityPostSchema = new mongoose.Schema({
  authorId: { type: String, default: "" },
  authorName: { type: String, default: "Student" },
  title: { type: String, default: "" },
  body: { type: String, default: "" },
  comments: { type: [CommentSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

CommunityPostSchema.index({ createdAt: -1 });

export default mongoose.models.CommunityPost ||
  mongoose.model("CommunityPost", CommunityPostSchema);
