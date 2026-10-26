import { SessionProvider } from "@/context/SessionContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ConfirmProvider } from "@/components/portal/ConfirmDialog";
import { ToastProvider } from "@/components/portal/ToastProvider";

// Admin portal root: theme (dark/light), session, a SweetAlert-style confirm
// dialog, and toast notifications (auto-shown on every save / update / delete)
// available to all admin screens.
export default function AdminLayout({ children }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ConfirmProvider>
          <ToastProvider>{children}</ToastProvider>
        </ConfirmProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
