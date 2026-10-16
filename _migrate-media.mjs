// One-time migration: move existing base64 media from MongoDB to Cloudinary,
// replacing each base64 field with its Cloudinary URL. Safe + idempotent:
//   - only docs that still hold base64 are touched
//   - a field is replaced ONLY after a successful upload (offloadMedia returns
//     the original value on failure, so nothing is lost)
//   - running it again does nothing (URLs are skipped)
// Dry run (default) only reports. Pass APPLY=1 to actually write.
import mongoose from "mongoose";
import { offloadMedia, isCloudinaryConfigured } from "./src/lib/cloudinary.js";

const APPLY = process.env.APPLY === "1";

if (!process.env.MONGODB_URI) { console.error("MONGODB_URI missing"); process.exit(1); }
if (!isCloudinaryConfigured()) { console.error("Cloudinary not configured"); process.exit(1); }

await mongoose.connect(process.env.MONGODB_URI);

const { default: Course } = await import("./src/models/Course.js");
const { default: Student } = await import("./src/models/Student.js");
const { default: Assessment } = await import("./src/models/Assessment.js");
const { default: Instructor } = await import("./src/models/Instructor.js");
const { default: Banner } = await import("./src/models/Banner.js");

const JOBS = [
  { name: "Course", Model: Course, folder: "nuvosid/courses", fields: ["thumbnail", "banner", "classes", "materials", "videos"] },
  { name: "Student", Model: Student, folder: "nuvosid/students", fields: ["image", "identityProof"] },
  { name: "Assessment", Model: Assessment, folder: "nuvosid/assessments", fields: ["questions", "questionsB", "writtenQuestions", "writtenQuestionsB", "interviewQuestions", "interviewQuestionsB"] },
  { name: "Instructor", Model: Instructor, folder: "nuvosid/instructors", fields: ["image"] },
  { name: "Banner", Model: Banner, folder: "nuvosid/banners", fields: ["image"] },
];

const hasBase64 = (v) => JSON.stringify(v ?? "").includes(";base64,");
const mb = (n) => (n / 1048576).toFixed(2);

let grandDocs = 0, grandBytes = 0, grandUploads = 0;

for (const job of JOBS) {
  const docs = await job.Model.find().lean();
  let touched = 0, bytes = 0, uploads = 0;
  for (const doc of docs) {
    const subset = {};
    let docHas = false;
    for (const f of job.fields) {
      if (doc[f] != null && hasBase64(doc[f])) { subset[f] = doc[f]; docHas = true; }
    }
    if (!docHas) continue;
    touched++;
    const before = JSON.stringify(subset);
    bytes += Buffer.byteLength(before);
    uploads += (before.match(/;base64,/g) || []).length;
    if (APPLY) {
      const migrated = await offloadMedia(subset, { folder: job.folder });
      await job.Model.updateOne({ _id: doc._id }, { $set: migrated });
      process.stdout.write(".");
    }
  }
  if (APPLY && touched) process.stdout.write("\n");
  console.log(`${job.name}: ${touched}/${docs.length} docs with media · ~${mb(bytes)} MB · ${uploads} file(s)`);
  grandDocs += touched; grandBytes += bytes; grandUploads += uploads;
}

console.log("─".repeat(50));
console.log(`${APPLY ? "MIGRATED" : "DRY RUN"} · ${grandDocs} docs · ${grandUploads} files · ~${mb(grandBytes)} MB of base64`);
if (!APPLY) console.log("Re-run with APPLY=1 to actually upload + rewrite.");

await mongoose.disconnect();
process.exit(0);
