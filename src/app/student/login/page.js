import PortalLogin from "@/components/portal/PortalLogin";

export default function StudentLoginPage() {
  return (
    <PortalLogin
      brand="Student Portal"
      requiredRole="student"
      redirectTo="/student/dashboard"
    />
  );
}
