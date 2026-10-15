import mongoose from "mongoose";

// Cached connection so repeated route-handler calls reuse one Mongo connection
// (important in dev where modules hot-reload).
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable");
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

// True when no real DB is configured — mirrors the old API's mock fallback so
// login/signup keep working out of the box before a MongoDB URI is set.
export function isMockConfigured() {
  return (
    !process.env.MONGODB_URI ||
    process.env.MONGODB_URI.includes("cluster.mongodb.net/db")
  );
}

// In production (e.g. Vercel) the in-memory Mock Mode is NOT a valid store:
// serverless instances don't share memory and it isn't persisted, so data
// appears to "vanish" between requests. So in production we must never silently
// fall back to mock — we surface a clear error instead. Mock stays available in
// development so the app runs locally before a DB is configured.
const IS_PROD = process.env.NODE_ENV === "production";

// Decide mock vs real DB for a request. In dev, falls back to mock when no DB is
// configured or the DB is down. In production, refuses to use mock and throws a
// clear, actionable error so the misconfiguration is obvious in the logs.
export async function resolveUseMock() {
  if (isMockConfigured()) {
    if (IS_PROD) {
      throw new Error(
        "MONGODB_URI is not configured in this deployment. Set MONGODB_URI (and JWT_SECRET) in your hosting environment variables and redeploy — the app will NOT use in-memory Mock Mode in production because that data is not persisted."
      );
    }
    return true;
  }
  try {
    await connectToDatabase();
    return false;
  } catch (e) {
    if (IS_PROD) {
      // Don't silently drop to mock in production — that loses data. Fail loud.
      console.error("❌ MongoDB connection failed in production:", e.message);
      throw new Error(
        "Could not connect to MongoDB. Check that MONGODB_URI is correct and that MongoDB Atlas → Network Access allows connections from anywhere (0.0.0.0/0), then redeploy. Details: " + e.message
      );
    }
    console.warn("⚠️ MongoDB connection failed, using Mock Mode (dev only):", e.message);
    return true;
  }
}

// In-memory store used only in Mock Mode.
export function mockUsers() {
  if (!globalThis.__mockUsers) globalThis.__mockUsers = [];
  return globalThis.__mockUsers;
}

// In-memory category store (Mock Mode) seeded with a few categories.
export function mockCategories() {
  if (!globalThis.__mockCategories) {
    globalThis.__mockCategories = [
      { _id: "cat_1", name: "Architecture & Structures", status: "Active", createdAt: new Date() },
      { _id: "cat_2", name: "UI/UX Design", status: "Active", createdAt: new Date() },
      { _id: "cat_3", name: "Interior Design", status: "Active", createdAt: new Date() },
    ];
  }
  return globalThis.__mockCategories;
}

// In-memory video store (Mock Mode).
export function mockVideos() {
  if (!globalThis.__mockVideos) globalThis.__mockVideos = [];
  return globalThis.__mockVideos;
}

// In-memory notification store (Mock Mode).
export function mockNotifications() {
  if (!globalThis.__mockNotifications) globalThis.__mockNotifications = [];
  return globalThis.__mockNotifications;
}

// In-memory banner store (Mock Mode).
export function mockBanners() {
  if (!globalThis.__mockBanners) globalThis.__mockBanners = [];
  return globalThis.__mockBanners;
}

// In-memory instructor store (Mock Mode) seeded with a few instructors.
export function mockInstructors() {
  if (!globalThis.__mockInstructors) {
    globalThis.__mockInstructors = [
      { _id: "i_1", name: "Siddharth Sharma", designation: "Founder & CEO, Surpass Prowess India Pvt. Ltd.", url: "https://surpass.academy/siddharth-sharma/", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop", status: "Active", createdAt: new Date() },
      { _id: "i_2", name: "Prachi Mehta", designation: "Chartered Accountant, Director NIFD Global", url: "https://surpass.academy/prachi-mehta/", image: "", status: "Active", createdAt: new Date() },
      { _id: "i_3", name: "A.K. Sharma", designation: "B. Tech Civil (IIT Delhi). Consultant AVS Engineers", url: "https://example.com/ak-sharma", image: "", status: "Active", createdAt: new Date() },
      { _id: "i_4", name: "Kritik Kothari", designation: "Promotor & Growth Partner at The Chemical Centre", url: "https://example.com/kritik-kothari", image: "", status: "Active", createdAt: new Date() },
    ];
  }
  return globalThis.__mockInstructors;
}

// In-memory admin-managed student store (Mock Mode).
export function mockStudents() {
  if (!globalThis.__mockStudents) globalThis.__mockStudents = [];
  return globalThis.__mockStudents;
}

// In-memory panel-user store (Mock Mode).
export function mockAdminUsers() {
  if (!globalThis.__mockAdminUsers) {
    globalThis.__mockAdminUsers = [
      {
        _id: "au_1",
        name: "adminxps",
        email: "budaklzcrew@gmail.com",
        contactNo: "",
        role: "ADMIN",
        username: "adminxps",
        password: "seeded",
        status: "Active",
        createdAt: new Date(),
      },
    ];
  }
  return globalThis.__mockAdminUsers;
}

// In-memory role store (Mock Mode) seeded with a default ADMIN role.
export function mockRoles() {
  if (!globalThis.__mockRoles) {
    globalThis.__mockRoles = [
      { _id: "r_admin", name: "ADMIN", status: "Active", permissions: {}, createdAt: new Date() },
    ];
  }
  return globalThis.__mockRoles;
}

// In-memory course store (Mock Mode) seeded with a few sample courses.
export function mockCourses() {
  if (!globalThis.__mockCourses) {
    globalThis.__mockCourses = [
      { _id: "c1", title: "Master AutoCAD LT 2023", shortDescription: "Professional AutoCAD drafting & compliance.", instructor: "Siddharth Sharma", duration: "3 Months", lessons: "24", price: "₹24,999", subscriptionType: "B2C", websiteUrl: "https://surpass.academy/autocad/", status: "Active", studentsEnrolled: 32, videos: [], category: "Architecture & Structures", level: "Beginner to Advanced", description: "Professional AutoCAD drafting & compliance.", createdAt: new Date() },
      { _id: "c2", title: "Advanced Product Design", shortDescription: "End-to-end product design.", instructor: "Manan Agrawal", duration: "6 Months", lessons: "40", price: "₹49,999", subscriptionType: "B2C", websiteUrl: "https://surpass.academy/product-design/", status: "Active", studentsEnrolled: 12, videos: [], category: "UI/UX Design", level: "Advanced", description: "End-to-end product design, research to prototype.", createdAt: new Date() },
      { _id: "c3", title: "Interaction Design", shortDescription: "Micro-interactions & prototyping.", instructor: "Kritik Kothari", duration: "3 Months", lessons: "18", price: "₹29,999", subscriptionType: "B2B", websiteUrl: "https://surpass.academy/interaction/", status: "Active", studentsEnrolled: 1, videos: [], category: "UI/UX Design", level: "Intermediate", description: "Micro-interactions & high-fidelity prototyping.", createdAt: new Date() },
    ];
  }
  return globalThis.__mockCourses;
}

export function mockLiveClasses() {
  if (!globalThis.__mockLiveClasses) globalThis.__mockLiveClasses = [];
  return globalThis.__mockLiveClasses;
}

export function mockAssessments() {
  if (!globalThis.__mockAssessments) globalThis.__mockAssessments = [];
  return globalThis.__mockAssessments;
}

export function mockEnrollments() {
  if (!globalThis.__mockEnrollments) globalThis.__mockEnrollments = [];
  return globalThis.__mockEnrollments;
}

export function mockAssessmentResults() {
  if (!globalThis.__mockAssessmentResults) globalThis.__mockAssessmentResults = [];
  return globalThis.__mockAssessmentResults;
}

export function mockWorkshops() {
  if (!globalThis.__mockWorkshops) globalThis.__mockWorkshops = [];
  return globalThis.__mockWorkshops;
}

export function mockResumes() {
  if (!globalThis.__mockResumes) globalThis.__mockResumes = [];
  return globalThis.__mockResumes;
}
