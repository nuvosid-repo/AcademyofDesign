// One-time seed / migration for the real MongoDB.
//   - ensures the admin account (User collection)
//   - migrates any existing student Users → Student collection
//   - ensures a demo student + default categories
//
// Run (after setting MONGODB_URI in .env.local):
//   node --env-file=.env.local scripts/seed.mjs
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is not set. Run:  node --env-file=.env.local scripts/seed.mjs");
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  name: String, email: { type: String, lowercase: true, trim: true }, password: String,
  role: { type: String, default: "student" }, createdAt: { type: Date, default: Date.now },
});
const StudentSchema = new mongoose.Schema({
  name: String, email: { type: String, lowercase: true, trim: true }, password: String,
  status: { type: String, default: "Active" }, subscriptionType: { type: String, default: "Individual" },
  createdAt: { type: Date, default: Date.now },
}, { strict: false });
const CategorySchema = new mongoose.Schema({
  name: String, status: { type: String, default: "Active" }, createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Student = mongoose.models.Student || mongoose.model("Student", StudentSchema);
const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);

async function ensureStudent(name, email, plainPassword) {
  if (await Student.findOne({ email })) { console.log(`• student already exists: ${email}`); return; }
  await Student.create({ name, email, password: await bcrypt.hash(plainPassword, 10), status: "Active", subscriptionType: "Individual" });
  console.log(`✅ created student: ${email}`);
}

async function run() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(uri, { bufferCommands: false });
  console.log("Connected ✅");

  // Admin
  const adminEmail = "admin@nuvosid.design";
  if (!(await User.findOne({ email: adminEmail }))) {
    await User.create({ name: "Admin", email: adminEmail, password: await bcrypt.hash("admin123", 10), role: "admin" });
    console.log(`✅ created admin: ${adminEmail} / admin123`);
  } else {
    console.log(`• admin already exists: ${adminEmail}`);
  }

  // Migrate existing student Users → Student collection, then remove them from User.
  const studentUsers = await User.find({ role: { $ne: "admin" } });
  let migrated = 0;
  for (const u of studentUsers) {
    if (!(await Student.findOne({ email: u.email }))) {
      await Student.create({ name: u.name, email: u.email, password: u.password, status: "Active", subscriptionType: "Individual" });
      migrated++;
    }
    await User.deleteOne({ _id: u._id });
  }
  if (migrated) console.log(`✅ migrated ${migrated} student(s) from User → Student`);

  // Demo student + categories
  await ensureStudent("Demo Student", "demo@nuvosid.design", "password123");
  for (const name of ["Architecture & Structures", "UI/UX Design", "Interior Design"]) {
    if (!(await Category.findOne({ name }))) { await Category.create({ name }); console.log(`✅ created category: ${name}`); }
  }

  await mongoose.disconnect();
  console.log("\nDone. Website signups now appear in Admin → Students. 🎉");
  process.exit(0);
}

run().catch((e) => { console.error("Seed failed:", e.message); process.exit(1); });
