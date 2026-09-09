import { redirect } from "next/navigation";

// Bare /admin → send to the dashboard (proxy already gates auth/role).
export default function AdminIndex() {
  redirect("/admin/dashboard");
}
