import { SessionProvider } from "@/context/SessionContext";
import { ConfirmProvider } from "@/components/portal/ConfirmDialog";

// Admin portal root: session + a SweetAlert-style confirm dialog available to
// all admin screens.
export default function AdminLayout({ children }) {
  return (
    <SessionProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </SessionProvider>
  );
}
