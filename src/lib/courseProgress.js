// Shared course-progress helpers.

// Total (non-quiz) videos in a course — used for completion % and certificates.
export function courseVideoCount(c) {
  if (!c) return 0;
  const classes = (c.classes && c.classes.length) ? c.classes : ((c.videos?.length) ? [{ type: "class", videos: c.videos }] : []);
  return classes.reduce((n, cl) => n + (cl.type === "quiz" ? 0 : (cl.videos?.length || 0)), 0);
}

// Whether an enrollment's student has completed the whole course.
export function isCourseCompleted(enrollment, course) {
  const total = courseVideoCount(course);
  const done = Array.isArray(enrollment?.completedVideos) ? enrollment.completedVideos.length : 0;
  return total > 0 && done >= total;
}
