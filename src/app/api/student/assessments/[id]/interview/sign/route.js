import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { signUpload } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/student/assessments/:id/interview/sign — returns a Cloudinary upload
// signature so the browser can upload the interview recording directly to the
// cloud (the video never passes through this server). Auth-gated.
export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sign = signUpload({ folder: "nuvosid/interviews" });
  // Cloud storage not configured → tell the client gracefully (it skips upload).
  if (!sign) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, ...sign });
}
