// Shared assessment field mapping used by admin + student routes.

const cleanMCQ = (arr) =>
  Array.isArray(arr)
    ? arr
        .filter((q) => (q.question || "").trim() && (q.options || []).some((o) => (o || "").trim()))
        .map((q) => {
          const options = (q.options || []).map((o) => (o || "").toString());
          let correct = Array.isArray(q.correctIndexes) ? q.correctIndexes.map(Number) : [];
          if (!correct.length && q.correctIndex != null) correct = [Number(q.correctIndex)];
          correct = [...new Set(correct.filter((n) => Number.isInteger(n) && n >= 0 && n < options.length))];
          if (!correct.length) correct = [0];
          const multiple = !!q.multiple || correct.length > 1;
          return { question: q.question, options, correctIndex: correct[0], correctIndexes: correct, multiple, media: (q.media || "").toString() };
        })
    : [];

// Whether a student's answer to an MCQ is correct. `answer` may be a single
// option index (single-answer) or an array of indexes (multiple-answer). For
// multiple-answer questions the selected set must EXACTLY match the correct set.
export function isMcqCorrect(q, answer) {
  const correct = (q.correctIndexes && q.correctIndexes.length) ? q.correctIndexes : [q.correctIndex];
  const correctSet = new Set(correct.map(Number));
  const sel = Array.isArray(answer)
    ? answer.map(Number).filter((n) => n >= 0)
    : (answer == null || Number(answer) < 0 ? [] : [Number(answer)]);
  const selSet = new Set(sel);
  if (q.multiple || correctSet.size > 1) {
    if (selSet.size !== correctSet.size) return false;
    for (const c of correctSet) if (!selSet.has(c)) return false;
    return true;
  }
  return selSet.size === 1 && correctSet.has([...selSet][0]);
}

const cleanMarked = (arr) =>
  Array.isArray(arr)
    ? arr.filter((q) => (q.question || "").trim()).map((q) => ({ question: q.question, maxMarks: Number(q.maxMarks) || 0, modelAnswer: (q.modelAnswer || "").toString(), media: (q.media || "").toString() }))
    : [];

export function serializeAssessment(a) {
  // Derive enable flags for legacy records (created before the combined flow).
  const mcqEnabled = a.mcqEnabled != null ? !!a.mcqEnabled : (a.type === "MCQ" && (a.questions || []).length > 0);
  const interviewEnabled = a.interviewEnabled != null ? !!a.interviewEnabled : (a.type === "Live Interview");
  return {
    id: (a._id && a._id.toString()) || a.id,
    title: a.title,
    course: a.course || "",
    description: a.description || "",
    status: a.status || "Active",
    mcqEnabled,
    questions: a.questions || [],
    passingScore: a.passingScore || 0,
    writtenEnabled: !!a.writtenEnabled,
    writtenQuestions: a.writtenQuestions || [],
    interviewEnabled,
    interviewDate: a.interviewDate || "",
    interviewTime: a.interviewTime || "",
    interviewLink: a.interviewLink || "",
    interviewer: a.interviewer || "",
    interviewQuestions: a.interviewQuestions || [],
    // Second attempt (Set B)
    setBEnabled: !!a.setBEnabled,
    questionsB: a.questionsB || [],
    writtenQuestionsB: a.writtenQuestionsB || [],
    interviewQuestionsB: a.interviewQuestionsB || [],
    type: a.type || "MCQ",
    createdAt: a.createdAt,
  };
}

// Combined pass/fail across the enabled sections (MCQ + Written + Interview).
// `ready` is true only once every enabled section is scored (MCQ auto, Written
// & Interview admin-graded). Pass = combined % >= the assessment's passingScore.
export function combinedResult(s, r) {
  r = r || {};
  const parts = [];
  if (s.mcqEnabled) parts.push({ done: !!r.mcqDone, score: r.mcqScore || 0, total: r.mcqTotal || 0 });
  if (s.writtenEnabled) parts.push({ done: !!r.writtenGraded, score: r.writtenScore || 0, total: r.writtenTotal || 0 });
  if (s.interviewEnabled) parts.push({ done: !!r.interviewGraded, score: r.interviewScore || 0, total: r.interviewTotal || 0 });
  const ready = parts.length > 0 && parts.every((p) => p.done);
  const totalScore = parts.reduce((n, p) => n + p.score, 0);
  const totalMax = parts.reduce((n, p) => n + p.total, 0);
  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const passed = ready && percentage >= (s.passingScore || 0);
  return { ready, percentage, passed, totalScore, totalMax };
}

// Return the questions for the set a student is on ("A" = first attempt,
// "B" = second attempt). Falls back to Set A if Set B is missing.
export function pickSet(s, examSet) {
  const useB = examSet === "B" && s.setBEnabled;
  return {
    questions: useB && (s.questionsB || []).length ? s.questionsB : s.questions,
    writtenQuestions: useB && (s.writtenQuestionsB || []).length ? s.writtenQuestionsB : s.writtenQuestions,
    interviewQuestions: useB && (s.interviewQuestionsB || []).length ? s.interviewQuestionsB : s.interviewQuestions,
  };
}

export function buildAssessmentDoc(b) {
  return {
    title: (b.title || "").trim(),
    course: (b.course || "").trim(),
    description: (b.description || "").trim(),
    status: b.status === "Inactive" ? "Inactive" : "Active",
    type: "MCQ", // legacy field, unused by the combined flow

    mcqEnabled: !!b.mcqEnabled,
    questions: b.mcqEnabled ? cleanMCQ(b.questions) : [],
    passingScore: Number(b.passingScore) || 0,

    writtenEnabled: !!b.writtenEnabled,
    writtenQuestions: b.writtenEnabled ? cleanMarked(b.writtenQuestions) : [],

    interviewEnabled: !!b.interviewEnabled,
    interviewDate: (b.interviewDate || "").trim(),
    interviewTime: (b.interviewTime || "").trim(),
    interviewLink: (b.interviewLink || "").trim(),
    interviewer: (b.interviewer || "").trim(),
    interviewQuestions: b.interviewEnabled ? cleanMarked(b.interviewQuestions) : [],

    // Second attempt (Set B) — only stored when enabled.
    setBEnabled: !!b.setBEnabled,
    questionsB: b.setBEnabled && b.mcqEnabled ? cleanMCQ(b.questionsB) : [],
    writtenQuestionsB: b.setBEnabled && b.writtenEnabled ? cleanMarked(b.writtenQuestionsB) : [],
    interviewQuestionsB: b.setBEnabled && b.interviewEnabled ? cleanMarked(b.interviewQuestionsB) : [],
  };
}
