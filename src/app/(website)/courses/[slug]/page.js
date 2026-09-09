// Server wrapper: pre-generates a static page for every course slug
// (from courseDetails.json plus every course id inside courses.json).
import courseDetails from "@/data/courseDetails.json";
import categories from "@/data/courses.json";
import CourseDetailClient from "./CourseDetailClient";

export function generateStaticParams() {
  const ids = new Set(courseDetails.map((c) => c.id));
  categories.forEach((cat) => (cat.courses || []).forEach((c) => ids.add(c.id)));
  return [...ids].map((slug) => ({ slug }));
}

// Admin-managed course ids aren't in the static params, so allow on-demand
// rendering. CourseDetailClient falls back to fetching the admin course.
export const dynamicParams = true;

export default function Page() {
  return <CourseDetailClient />;
}
