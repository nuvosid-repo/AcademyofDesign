import { NextResponse } from "next/server";
import { resolveUseMock, mockResumes, mockStudents } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { cleanResume, isResumeComplete, serializeResume } from "@/lib/resumeFields";
import Resume from "@/models/Resume";
import Student from "@/models/Student";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/student/resume — the signed-in student's saved resume (or null).
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useMock = await resolveUseMock();
  const doc = useMock
    ? mockResumes().find((r) => r.studentId === auth.id)
    : await Resume.findOne({ studentId: auth.id }).lean().catch(() => null);
  return NextResponse.json({ resume: doc ? serializeResume(doc) : null });
}

// PUT /api/student/resume — save (upsert) the student's own resume.
export async function PUT(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const data = cleanResume(body);
  const completed = isResumeComplete(data);

  const useMock = await resolveUseMock();
  // Account name/email for the admin list.
  const student = useMock
    ? mockStudents().find((s) => ((s._id && s._id.toString()) || s.id) === auth.id)
    : await Student.findById(auth.id).select("name email").lean().catch(() => null);
  const studentName = student?.name || auth.name || data.name || "";
  const studentEmail = student?.email || data.email || "";

  const fields = { ...data, studentId: auth.id, studentName, studentEmail, completed, updatedAt: new Date() };

  if (useMock) {
    const store = mockResumes();
    const idx = store.findIndex((r) => r.studentId === auth.id);
    if (idx === -1) store.unshift({ _id: "res_" + Date.now(), ...fields, createdAt: new Date() });
    else Object.assign(store[idx], fields);
    const saved = store.find((r) => r.studentId === auth.id);
    return NextResponse.json({ success: true, resume: serializeResume(saved) });
  }

  const saved = await Resume.findOneAndUpdate(
    { studentId: auth.id },
    { $set: fields, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, new: true }
  ).lean();
  return NextResponse.json({ success: true, resume: serializeResume(saved) });
}
