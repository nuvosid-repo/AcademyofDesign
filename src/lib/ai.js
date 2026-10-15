import Anthropic from "@anthropic-ai/sdk";

// Claude-powered grading. Server-only — the API key never leaves the backend.
// Configure ANTHROPIC_API_KEY (and optionally ANTHROPIC_MODEL) in env.

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export function isAIConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let _client;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const clampMarks = (v, max) => {
  const n = Math.round((Number(v) || 0) * 2) / 2; // nearest 0.5
  return Math.max(0, Math.min(n, Number(max) || 0));
};

// Pull the first JSON object out of a model reply (handles stray prose / fences).
function extractJSON(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const s = body.indexOf("{");
  const e = body.lastIndexOf("}");
  if (s === -1 || e === -1) return null;
  try { return JSON.parse(body.slice(s, e + 1)); } catch { return null; }
}

/**
 * Grade written-exam answers with Claude.
 * @param {Array<{question:string,maxMarks:number,modelAnswer?:string}>} questions
 * @param {string[]} answers  student answers, index-aligned to questions
 * @param {{course?:string,title?:string}} ctx
 * @returns {Promise<Array<{marks:number,feedback:string}>>}
 */
export async function gradeWrittenAnswers(questions, answers, ctx = {}) {
  if (!isAIConfigured()) throw new Error("ANTHROPIC_API_KEY not configured");
  const items = (questions || []).map((q, i) => ({
    index: i,
    question: q.question || "",
    maxMarks: Number(q.maxMarks) || 0,
    modelAnswer: q.modelAnswer || "",
    studentAnswer: (answers?.[i] || "").toString(),
  }));
  if (!items.length) return [];

  const system =
    `You are a strict but fair examiner for an online design academy` +
    (ctx.course ? ` (course: "${ctx.course}")` : "") +
    `. Grade each written answer out of its maxMarks based on correctness, completeness, clarity and relevance to the question. ` +
    `If a modelAnswer is given, use it as the reference for a full-marks response. Award 0 for blank, irrelevant, or copied-question answers. ` +
    `Be consistent and avoid bias. Respond with ONLY valid JSON, no prose.`;

  const user =
    `Grade these ${items.length} answer(s). For each give "marks" (a number between 0 and that item's maxMarks, halves allowed) ` +
    `and a one-sentence "feedback" explaining the score.\n\n` +
    `${JSON.stringify(items, null, 2)}\n\n` +
    `Respond exactly as: {"grades":[{"index":0,"marks":<number>,"feedback":"..."}]}`;

  const res = await getClient().messages.create({
    model: AI_MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = (res.content || []).map((c) => c.text || "").join("");
  const parsed = extractJSON(text);
  const grades = Array.isArray(parsed?.grades) ? parsed.grades : [];

  return items.map((it, i) => {
    const g = grades.find((x) => Number(x?.index) === i) || grades[i] || {};
    return { marks: clampMarks(g.marks, it.maxMarks), feedback: (g.feedback || "").toString().slice(0, 500) };
  });
}
