// Server wrapper: pre-generates a static page for every mentor slug.
// The interactive UI lives in the client component below.
import instructorsList from "@/data/instructors.json";
import MentorDetailClient from "./MentorDetailClient";

export function generateStaticParams() {
  return instructorsList.map((m) => ({ slug: m.slug }));
}

// Only the slugs above are valid; anything else 404s in the static export.
export const dynamicParams = false;

export default function Page() {
  return <MentorDetailClient />;
}
