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

    // Resolve the CURRENT name from the DB (not the one baked into the token at
    // login) so an admin editing a student/user's name reflects without a
    // re-login. Falls back to the token name on any lookup issue.
    let name = payload.name;
    try {
      const useMock = await resolveUseMock();
      if (useMock) {
        const stores = payload.role === "admin" ? [mockUsers(), mockAdminUsers()] : [mockStudents()];
        for (const st of stores) {
          const found = st.find((x) => (((x._id && x._id.toString()) || x.id) || "") === payload.id);
          if (found?.name) { name = found.name; break; }
        }
      } else if (payload.role === "admin") {
        const u = (await User.findById(payload.id).select("name").lean().catch(() => null))
              || (await AdminUser.findById(payload.id).select("name").lean().catch(() => null));
        if (u?.name) name = u.name;
      } else {
        const s = await Student.findById(payload.id).select("name").lean().catch(() => null);
        if (s?.name) name = s.name;
      }
    } catch { /* keep the token name */ }

    return NextResponse.json({
      authenticated: true,
      user: { id: payload.id, role: payload.role, name },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
