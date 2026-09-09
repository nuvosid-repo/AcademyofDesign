"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

// Client-side guard: waits for the session check, then redirects to the given
// login page if the user is missing or doesn't have the required role.
// (middleware.js does the server-side first pass; this is the in-app backup.)
export default function RequireRole({ role, loginPath, theme = "dark", children }) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(loginPath);
    } else if (role && user.role !== role) {
      // Wrong role — send them to their own area's login.
      router.replace(loginPath);
    }
  }, [user, loading, role, loginPath, router]);

  if (loading || !user || (role && user.role !== role)) {
    const light = theme === "light";
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          light ? "bg-gray-50 text-gray-500" : "bg-neutral-950 text-neutral-400"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-4 h-4 rounded-full border-2 animate-spin ${
              light ? "border-gray-300 border-t-[#db254f]" : "border-neutral-600 border-t-rose-500"
            }`}
          />
          Loading…
        </div>
      </div>
    );
  }

  return children;
}
