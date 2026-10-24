import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { signUpload } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Folders the browser is allowed to upload into (prevents arbitrary targets).
const ALLOWED = new Set(["nuvosid/resumes", "nuvosid/exams"]);

// POST /api/cloudinary/sign { folder } — returns a signed payload so the browser
// can upload an image straight to Cloudinary (keeping base64 out of autosave).
export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { folder } = await request.json().catch(() => ({}));
  const target = ALLOWED.has(folder) ? folder : "nuvosid/resumes";

  const sign = signUpload({ folder: target });
  if (!sign) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, ...sign });
}
