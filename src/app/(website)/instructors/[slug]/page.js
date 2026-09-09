// Server wrapper: pre-generates a static page for every mentor slug.
// The interactive UI lives in the client component below.
import instructorsList from "@/data/instructors.json";
import MentorDetailClient from "./MentorDetailClient";

export function generateStaticParams() {
  return instructorsList.map((m) => ({ slug: m.slug }));
}

// Admin-managed mentors use their own ids as slugs, so allow any slug — the
// client resolves it from the API (falling back to the static bundle).
export const dynamicParams = true;

export default function Page() {
  return <MentorDetailClient />;
}
