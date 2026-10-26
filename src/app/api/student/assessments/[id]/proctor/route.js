import { NextResponse } from "next/server";
import { resolveUseMock, mockAssessmentResults } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import AssessmentResult from "@/models/AssessmentResult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/student/assessments/:id/proctor — save the recorded exam video URL
// and the proctoring violation flags for the signed-in student's result.
// Body: { videoUrl, flags: [{ type, at }] }
export async function POST(request, { params }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { videoUrl, flags, tabSwitches, autoSubmittedForTabSwitch } = await request.json().catch(() => ({}));

  const cleanFlags = (Array.isArray(flags) ? flags : [])
    .slice(0, 500)
    .map((f) => ({ type: (f?.type || "").toString().slice(0, 40), at: Number(f?.at) || 0 }))
    .filter((f) => f.type);

  const set = { updatedAt: new Date() };
  if (typeof videoUrl === "string" && videoUrl) set.examVideoUrl = videoUrl;
  if (cleanFlags.length) set.proctorFlags = cleanFlags;
  if (Number.isFinite(Number(tabSwitches))) set.tabSwitches = Math.max(0, Math.min(999, Math.round(Number(tabSwitches))));
  if (typeof autoSubmittedForTabSwitch === "boolean") set.autoSubmittedForTabSwitch = autoSubmittedForTabSwitch;
  if (!set.examVideoUrl && !set.proctorFlags && set.tabSwitches == null && set.autoSubmittedForTabSwitch == null) {
    return NextResponse.json({ success: true, skipped: true });
  }

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockAssessmentResults();
    const r = store.find((x) => x.studentId === auth.id && x.assessmentId === id);
    if (r) Object.assign(r, set);
    return NextResponse.json({ success: true });
  }

  await AssessmentResult.findOneAndUpdate(
    { studentId: auth.id, assessmentId: id },
    { $set: set, $setOnInsert: { createdAt: new Date(), studentId: auth.id, studentName: auth.name || "", assessmentId: id } },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}
