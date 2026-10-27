import { NextResponse } from "next/server";
import { getBearer, verifyToken } from "@/lib/auth";
import { resolveUseMock, mockStudents, mockUsers, mockAdminUsers } from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import AdminUser from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const token = getBearer(request);
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    const payload = await verifyToken(token);

    // Resolve the current account record from the DB (not the token snapshot),
    // so (a) the latest NAME shows without a re-login, and (b) single-session is
    // enforced: if the stored sessionId differs from this token's, a newer login
    // on another device has superseded this one → log it out.
    let name = payload.name;
    let dbUser = null;
    try {
      const useMock = await resolveUseMock();
      if (useMock) {
        const stores = payload.role === "admin" ? [mockUsers(), mockAdminUsers()] : [mockStudents()];
        for (const st of stores) {
          const found = st.find((x) => (((x._id && x._id.toString()) || x.id) || "") === payload.id);
          if (found) { dbUser = found; break; }
        }
      } else if (payload.role === "admin") {
        dbUser = (await User.findById(payload.id).select("name sessionId").lean().catch(() => null))
              || (await AdminUser.findById(payload.id).select("name sessionId").lean().catch(() => null));
      } else {
        dbUser = await Student.findById(payload.id).select("name sessionId").lean().catch(() => null);
      }
      if (dbUser?.name) name = dbUser.name;
    } catch { /* keep the token name; skip session enforcement on lookup error */ }

    if (dbUser && dbUser.sessionId && payload.sid !== dbUser.sessionId) {
      return NextResponse.json({ authenticated: false, reason: "session_superseded" }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: payload.id, role: payload.role, name },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
