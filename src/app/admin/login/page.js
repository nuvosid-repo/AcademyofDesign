import PortalLogin from "@/components/portal/PortalLogin";

export default function AdminLoginPage() {
  return (
    <PortalLogin
      brand="Admin Portal"
      variant="light"
      requiredRole="admin"
      redirectTo="/admin/dashboard"
      hint="Demo: admin@nuvosid.design / admin123"
    />
  );
}
