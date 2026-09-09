import { NextResponse } from "next/server";
import { resolveUseMock, mockStudents, mockEnrollments } from "@/lib/db";
import { getAuthUser, bcrypt } from "@/lib/auth";
import Student from "@/models/Student";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELDS = [
  "name", "email", "dateOfBirth", "gender", "image", "contactNumber",
  "qualification", "institutionName", "country", "address", "identityProof",
  "subscriptionType", "status",
];

function serialize(s) {
  return {
    id: (s._id && s._id.toString()) || s.id,
    name: s.name, email: s.email, dateOfBirth: s.dateOfBirth || "", gender: s.gender || "",
    image: s.image || "", contactNumber: s.contactNumber || "", qualification: s.qualification || "",
    institutionName: s.institutionName || "", country: s.country || "", address: s.address || "",
    identityProof: s.identityProof || "", subscriptionType: s.subscriptionType || "B2C",
    status: s.status || "Active", createdAt: s.createdAt,
  };
}

export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const useMock = await resolveUseMock();

  // Attach each student's paid enrollments (matched by student id or email).
  const attachEnrollments = (students, enrollments) =>
    students.map((s) => {
      const mine = enrollments.filter(
        (e) => (e.studentId && e.studentId === s.id) || (e.studentEmail && s.email && e.studentEmail.toLowerCase() === s.email.toLowerCase())
      );
      // Unique course titles the student enrolled in.
      const titles = [...new Set(mine.map((e) => e.courseTitle).filter(Boolean))];
      return { ...s, enrolledCount: titles.length, enrolledCourses: titles };
    });

  if (useMock) {
    const students = mockStudents().map(serialize);
    return NextResponse.json({ students: attachEnrollments(students, mockEnrollments()) });
  }

  const docs = await Student.find().sort({ createdAt: -1 }).lean();
  const enr = await Enrollment.find().select("studentId studentEmail courseTitle").lean();
  return NextResponse.json({ students: attachEnrollments(docs.map(serialize), enr) });
}

export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const name = (b.name || "").trim();
  const email = (b.email || "").trim().toLowerCase();
  if (!name || !email || !b.password) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }
  const doc = {};
  for (const f of FIELDS) if (b[f] != null) doc[f] = b[f];
  doc.name = name; doc.email = email;
  doc.password = await bcrypt.hash(b.password, await bcrypt.genSalt(10));
  if (!doc.status) doc.status = "Active";

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockStudents();
    if (store.some((s) => s.email === email)) {
      return NextResponse.json({ error: "A student with this email already exists" }, { status: 400 });
    }
    const created = { _id: "st_" + Date.now(), ...doc, createdAt: new Date() };
    store.unshift(created);
    return NextResponse.json({ success: true, student: serialize(created) }, { status: 201 });
  }
  const created = await Student.create(doc);
  return NextResponse.json({ success: true, student: serialize(created) }, { status: 201 });
}
