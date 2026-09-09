import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// With bearer tokens logout is client-side (the token is dropped there).
// This endpoint stays for parity / future server-side revocation.
export async function GET() {
  return NextResponse.json({ message: "Logout successful", success: true });
}
