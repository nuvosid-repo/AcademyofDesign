// Server wrapper: pre-generates a static page for every workshop slug.
// The interactive UI lives in the client component below.
import workshopsList from "@/data/workshops.json";
import WorkshopDetailClient from "./WorkshopDetailClient";

export function generateStaticParams() {
  return workshopsList.map((w) => ({ slug: w.id }));
}

// Admin-managed workshops use their own ids as slugs, so allow any slug — the
// client resolves it from the API (falling back to the static bundle).
export const dynamicParams = true;

export default function Page() {
  return <WorkshopDetailClient />;
}
