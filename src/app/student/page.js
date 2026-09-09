import { redirect } from "next/navigation";

// Bare /student → send to the dashboard (proxy already gates auth).
export default function StudentIndex() {
  redirect("/student/dashboard");
}
