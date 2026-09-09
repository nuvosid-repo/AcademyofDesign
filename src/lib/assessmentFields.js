// Shared assessment field mapping used by admin + student routes.

const cleanMCQ = (arr) =>
  Array.isArray(arr)
    ? arr
        .filter((q) => (q.question || "").trim() && (q.options || []).some((o) => (o || "").trim()))
        .map((q) => ({ question: q.question, options: q.options || [], correctIndex: q.correctIndex || 0 }))
    : [];

const cleanMarked = (arr) =>
  Array.isArray(arr)
    ? arr.filter((q) => (q.question || "").trim()).map((q) => ({ question: q.question, maxMarks: Number(q.maxMarks) || 0 }))
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
    type: a.type || "MCQ",
    createdAt: a.createdAt,
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
  };
}
