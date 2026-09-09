import { NextResponse } from "next/server";
import { getBearer, verifyToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const token = getBearer(request);
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    const payload = await verifyToken(token);
    return NextResponse.json({
      authenticated: true,
      user: { id: payload.id, role: payload.role, name: payload.name },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
