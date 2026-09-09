// Format admin workshop date/time (stored as yyyy-mm-dd / HH:mm) into the
// readable strings the website shows. Falls back to legacy display strings.

export function displayDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
  if (!m) return date || ""; // already a display string, or empty
  try {
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  } catch { return date; }
}

export function to12h(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
  if (!m) return "";
  let h = +m[1];
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${m[2]} ${ap}`;
}

export function displayTime(startTime, endTime, legacy) {
  const s = to12h(startTime), e = to12h(endTime);
  if (s && e) return `${s} - ${e}`;
  if (s) return s;
  return legacy || "";
}
