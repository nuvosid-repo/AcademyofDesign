import { NextResponse } from "next/server";
import { resolveUseMock, mockUsers, mockStudents } from "@/lib/db";
import { bcrypt, signToken } from "@/lib/auth";
import User from "@/models/User";
import Student from "@/models/Student";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { email, password, requiredRole } = await request.json().catch(() => ({}));
    if (!email || !password) {
      return NextResponse.json(
        { error: "Please provide email and password" },
        { status: 400 }
      );
    }

    const useMock = await resolveUseMock();

    let user;
    if (useMock) {
      const users = mockUsers();
      // Seed demo accounts so both portals work immediately in Mock Mode.
      const demoEmail = "demo@nuvosid.design";
      if (!users.some((u) => u.email === demoEmail)) {
        users.push({
          _id: "mock_demo_user_id",
          name: "Demo User",
          email: demoEmail,
          password: await bcrypt.hash("password123", await bcrypt.genSalt(10)),
          role: "student",
        });
      }
      const adminEmail = "admin@nuvosid.design";
      if (!users.some((u) => u.email === adminEmail)) {
        users.push({
          _id: "mock_admin_user_id",
          name: "Admin",
          email: adminEmail,
          password: await bcrypt.hash("admin123", await bcrypt.genSalt(10)),
          role: "admin",
        });
      }
      // Admins live in mockUsers; students (signups + admin-added) in mockStudents.
      user = users.find((u) => u.email === email) || mockStudents().find((s) => s.email === email);
      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password (Mock Mode)" },
          { status: 401 }
        );
      }
    } else {
      // Admins live in the User collection; students in the Student collection.
      user = (await User.findOne({ email })) || (await Student.findOne({ email }));
      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Portal role enforcement (server-side). The admin login sends
    // requiredRole="admin", so only admin-role accounts ever receive a token
    // here. A non-admin gets the same generic error (no token, no account
    // enumeration) — students can never obtain admin access.
    if (requiredRole && (user.role || "student") !== requiredRole) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await signToken(user);
    return NextResponse.json({
      message: "Login successful",
      success: true,
      token,
      user: { name: user.name || "Demo User", role: user.role || "student" },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
