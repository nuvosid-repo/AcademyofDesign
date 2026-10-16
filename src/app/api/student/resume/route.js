import { NextResponse } from "next/server";
import { resolveUseMock, mockResumes, mockStudents } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { cleanResumeData, deriveFlatMirror, legacyToData, blankResumeData } from "@/lib/resume/schema";
import { offloadMedia } from "@/lib/cloudinary";
import Resume from "@/models/Resume";
import Student from "@/models/Student";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shape returned to the builder.
function serialize(doc) {
  const data = doc.data || legacyToData(doc, doc.discipline || "custom");
  return {
    id: (doc._id && doc._id.toString()) || doc.id,
    data,
    discipline: data.discipline,
    template: data.template,
    accentColor: data.accentColor,
    readinessScore: doc.readinessScore || 0,
    status: doc.status || "DRAFT",
    isPublic: !!doc.isPublic,
    publicSlug: doc.publicSlug || "",
    comments: (doc.comments || []).filter((c) => !c.resolved),
    reviewNote: doc.reviewNote || "",
    updatedAt: doc.updatedAt || doc.createdAt || null,
  };
}

// A resume is "complete" enough to count once the essentials are present.
function isComplete(data) {
  const b = data.basics || {};
  return !!(b.name && b.email && b.summary && (data.projects || []).length >= 1 && (data.education || []).length >= 1);
}

// GET /api/student/resume — the signed-in student's saved resume (or null).
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();
  const doc = useMock
    ? mockResumes().find((r) => r.studentId === auth.id)
    : await Resume.findOne({ studentId: auth.id }).lean().catch(() => null);
  return NextResponse.json({ resume: doc ? serialize(doc) : null });
}

// PUT /api/student/resume — save (upsert) the student's own rich resume.
export async function PUT(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  // Offload any uploaded images (photo, project covers) to Cloudinary BEFORE
  // cleaning — so the base64 is replaced by a short URL that passes the sanitizer.
  const offloaded = await offloadMedia(body.data || blankResumeData(), { folder: "nuvosid/resumes" });
  const data = cleanResumeData(offloaded);
  const mirror = deriveFlatMirror(data);
  const completed = isComplete(data);

  const useMock = await resolveUseMock();
  const student = useMock
    ? mockStudents().find((s) => ((s._id && s._id.toString()) || s.id) === auth.id)
    : await Student.findById(auth.id).select("name email").lean().catch(() => null);
  const studentName = student?.name || auth.name || data.basics.name || "";
  const studentEmail = student?.email || data.basics.email || "";

  const fields = {
    data, discipline: data.discipline, template: data.template, accentColor: data.accentColor, targetRole: data.targetRole,
    ...mirror, studentId: auth.id, studentName, studentEmail, completed, updatedAt: new Date(),
  };

  if (useMock) {
    const store = mockResumes();
    const idx = store.findIndex((r) => r.studentId === auth.id);
    if (idx === -1) store.unshift({ _id: "res_" + Date.now(), status: "DRAFT", ...fields, createdAt: new Date() });
    else Object.assign(store[idx], fields);
    return NextResponse.json({ success: true, resume: serialize(store.find((r) => r.studentId === auth.id)) });
  }

  const saved = await Resume.findOneAndUpdate(
    { studentId: auth.id },
    { $set: fields, $setOnInsert: { createdAt: new Date(), status: "DRAFT" } },
    { upsert: true, new: true }
  ).lean();
  return NextResponse.json({ success: true, resume: serialize(saved) });
}
