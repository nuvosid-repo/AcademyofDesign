import mongoose from "mongoose";

// A community answer (comment) on a question. Embedded in the post so a thread
// loads in one read. authorName is a snapshot taken when it was written.
const CommentSchema = new mongoose.Schema(
  {
    authorId: { type: String, default: "" },
    authorName: { type: String, default: "Student" },
    body: { type: String, default: "" },
    likedBy: { type: [String], default: [] }, // studentIds who liked this answer
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// A community question posted by a student. Other students answer via comments
// and can like both the question and individual answers.
const CommunityPostSchema = new mongoose.Schema({
  authorId: { type: String, default: "" },
  authorName: { type: String, default: "Student" },
  title: { type: String, default: "" },
  body: { type: String, default: "" },
  likedBy: { type: [String], default: [] }, // studentIds who liked this question
  comments: { type: [CommentSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

CommunityPostSchema.index({ createdAt: -1 });

// Drop any previously-compiled model so schema changes (e.g. likedBy) take
// effect on dev hot-reload instead of using a stale cached model.
if (mongoose.models.CommunityPost) delete mongoose.models.CommunityPost;

export default mongoose.model("CommunityPost", CommunityPostSchema);
