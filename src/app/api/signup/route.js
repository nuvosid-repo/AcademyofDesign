import { NextResponse } from "next/server";
import { resolveUseMock, mockStudents } from "@/lib/db";
import { bcrypt } from "@/lib/auth";
import Student from "@/models/Student";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Website signup creates a STUDENT record (the same collection the admin
// "Manage Students" page shows), so new signups appear in the admin panel.
export async function POST(request) {
  try {
    const { name, email, password, contactNumber } = await request.json().catch(() => ({}));
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Please provide all required fields" },
        { status: 400 }
      );
    }
    const cleanEmail = email.trim().toLowerCase();
    const contact = (contactNumber || "").trim();
    const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const useMock = await resolveUseMock();

    if (useMock) {
      const store = mockStudents();
      if (store.find((s) => s.email === cleanEmail)) {
        return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
      }
      store.unshift({ _id: "st_" + Date.now(), name, email: cleanEmail, contactNumber: contact, password: hashed, status: "Active", subscriptionType: "B2C", createdAt: new Date() });
      return NextResponse.json({ message: "User created successfully (Mock Mode)", success: true }, { status: 201 });
    }

    const existing = await Student.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }
    await Student.create({ name, email: cleanEmail, contactNumber: contact, password: hashed, status: "Active" });
    return NextResponse.json({ message: "User created successfully", success: true }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "An error occurred during signup" }, { status: 500 });
  }
}
