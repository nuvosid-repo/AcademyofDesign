import { NextResponse } from "next/server";
import * as jose from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "your_super_secret_jwt_key_here"
);

// First-line server-side guard (Next 16 "proxy" convention, formerly middleware).
// Only runs for /admin/* and /student/* (see `config.matcher`) — the public
// website routes are never touched.
export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const isAdmin = pathname.startsWith("/admin");
  const isStudent = pathname.startsWith("/student");
  if (!isAdmin && !isStudent) return NextResponse.next();

  // Login pages must stay public.
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/student/login")) {
    return NextResponse.next();
  }

  const loginUrl = new URL(isAdmin ? "/admin/login" : "/student/login", request.url);
  // Admin and student sessions use separate cookies so both can coexist.
  const cookieName = isAdmin ? "nuvosid_token_admin" : "nuvosid_token_student";
  const token = request.cookies.get(cookieName)?.value;
  if (!token) return NextResponse.redirect(loginUrl);

  try {
    const { payload } = await jose.jwtVerify(token, secret);
    // Strict separation: admin area = admin role only, student area = student
    // role only. A token for the wrong area is sent to that area's login.
    if (isAdmin && payload.role !== "admin") return NextResponse.redirect(loginUrl);
    if (isStudent && payload.role !== "student") return NextResponse.redirect(loginUrl);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*"],
};
