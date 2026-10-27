import { NextResponse } from "next/server";
import { resolveUseMock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import StudyTime from "@/models/StudyTime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_GAP = 75;        // seconds added per heartbeat is capped here, so an idle
const FIRST_BEAT = 60;     // gap (heartbeats stop) never inflates the total.

// Calendar date in IST ("YYYY-MM-DD") for a given instant.
const istDate = (d = new Date()) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

function mockStore() {
  if (!globalThis.__mockStudyTimes) globalThis.__mockStudyTimes = [];
  return globalThis.__mockStudyTimes;
}

// POST — a heartbeat from an active student. Adds only the real elapsed time
// since the last heartbeat (capped), so leaving the tab open while idle (which
// stops heartbeats) does not keep counting.
export async function POST(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const today = istDate();
  const now = new Date();

  const useMock = await resolveUseMock();
  if (useMock) {
    const store = mockStore();
    let r = store.find((x) => x.studentId === auth.id && x.date === today);
    const add = r?.lastBeatAt ? Math.min(Math.max(0, (now - new Date(r.lastBeatAt)) / 1000), MAX_GAP) : FIRST_BEAT;
    if (!r) { r = { studentId: auth.id, date: today, seconds: 0, lastBeatAt: null }; store.push(r); }
    r.seconds += Math.round(add); r.lastBeatAt = now;
    return NextResponse.json({ ok: true, todaySeconds: r.seconds });
  }

  const existing = await StudyTime.findOne({ studentId: auth.id, date: today }).lean().catch(() => null);
  const add = existing?.lastBeatAt ? Math.min(Math.max(0, (now - new Date(existing.lastBeatAt)) / 1000), MAX_GAP) : FIRST_BEAT;
  const r = await StudyTime.findOneAndUpdate(
    { studentId: auth.id, date: today },
    { $inc: { seconds: Math.round(add) }, $set: { lastBeatAt: now, updatedAt: now } },
    { upsert: true, new: true }
  );
  return NextResponse.json({ ok: true, todaySeconds: r.seconds });
}

// GET — the student's learning-time summary (today, this week, all-time + last 7 days).
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const today = istDate();

  const useMock = await resolveUseMock();
  const rows = useMock
    ? mockStore().filter((r) => r.studentId === auth.id)
    : await StudyTime.find({ studentId: auth.id }).lean();

  const byDate = {};
  let total = 0;
  for (const r of rows) { byDate[r.date] = (byDate[r.date] || 0) + (r.seconds || 0); total += (r.seconds || 0); }

  // Current calendar week, Monday → Sunday.
  const d0 = new Date(today + "T00:00:00Z");
  const dow = d0.getUTCDay();                 // 0=Sun … 6=Sat
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  const week = [];
  let weekSeconds = 0;
  for (let i = 0; i < 7; i++) {
    const ds = new Date(d0.getTime() + (i - mondayOffset) * 86400000).toISOString().slice(0, 10);
    const s = byDate[ds] || 0;
    week.push({ date: ds, seconds: s });
    weekSeconds += s;
  }

  return NextResponse.json({
    today,
    todaySeconds: byDate[today] || 0,
    weekSeconds,
    totalSeconds: total,
    week,
  });
}
