import { NextResponse } from "next/server";
import { resolveUseMock, mockUsers, mockStudents, mockAdminUsers } from "@/lib/db";
import { bcrypt, signToken } from "@/lib/auth";
import User from "@/models/User";
import Student from "@/models/Student";
import AdminUser from "@/models/AdminUser";

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
    // Normalize the email the same way signup does (trim + lowercase) so a stray
    // capital letter or trailing space can never cause a false "invalid" login.
    const cleanEmail = email.trim().toLowerCase();

    const useMock = await resolveUseMock();

    let user;
    // Panel users created under Masters > User live in a separate AdminUser
    // collection and store a role NAME (not the "admin" enum). When a login
    // matches one, we treat it as an admin explicitly.
    let isPanelAdmin = false;
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
      // The same email can be a student AND a panel user, so resolve by portal:
      // admin portal prefers admin/panel accounts; student portal prefers student.
      const uDoc = users.find((u) => u.email === cleanEmail);
      const aDoc = mockAdminUsers().find((u) => u.email === cleanEmail || u.username === email.trim());
      const sDoc = mockStudents().find((s) => s.email === cleanEmail);
      user = requiredRole === "admin" ? (uDoc || aDoc || sDoc) : (sDoc || uDoc || aDoc);
      isPanelAdmin = !!aDoc && user === aDoc;
      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password (Mock Mode)" },
          { status: 401 }
        );
      }
    } else {
      // The same email can exist as a Student (website) and an AdminUser
      // (Masters > User panel). Resolve by portal: the admin login prefers an
      // admin/panel account; the student login prefers the student account.
      // Panel users may sign in with their email or their username.
      const [uDoc, aDoc, sDoc] = await Promise.all([
        User.findOne({ email: cleanEmail }),
        AdminUser.findOne({ $or: [{ email: cleanEmail }, { username: email.trim() }] }),
        Student.findOne({ email: cleanEmail }),
      ]);
      user = requiredRole === "admin" ? (uDoc || aDoc || sDoc) : (sDoc || uDoc || aDoc);
      isPanelAdmin = !!aDoc && user === aDoc;
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

    // Panel users (Masters > User) are admins for login purposes; their stored
    // `role` is a role NAME, so we grant the "admin" role explicitly here.
    const effectiveRole = isPanelAdmin ? "admin" : (user.role || "student");

    // A deactivated panel user cannot sign in.
    if (isPanelAdmin && user.status && user.status !== "Active") {
      return NextResponse.json(
        { error: "This account is inactive. Please contact an administrator." },
        { status: 403 }
      );
    }

    // Portal role enforcement (server-side). The admin login sends
    // requiredRole="admin", so only admin-role accounts ever receive a token
    // here. A non-admin gets the same generic error (no token, no account
    // enumeration) — students can never obtain admin access.
    if (requiredRole && effectiveRole !== requiredRole) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Single active session: a fresh id is stored on the account at every login,
    // so any previously-signed-in device (holding the old id) is logged out.
    const sid = (globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2));
    if (useMock) {
      user.sessionId = sid;
    } else {
      try { await user.updateOne({ $set: { sessionId: sid } }); } catch { /* best effort */ }
    }

    const token = await signToken({
      _id: user._id,
      id: (user._id && user._id.toString()) || user.id,
      name: user.name,
      role: effectiveRole,
      sid,
    });
    return NextResponse.json({
      message: "Login successful",
      success: true,
      token,
      user: { name: user.name || "Demo User", role: effectiveRole },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
