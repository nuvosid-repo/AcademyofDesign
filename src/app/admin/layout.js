import { SessionProvider } from "@/context/SessionContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ConfirmProvider } from "@/components/portal/ConfirmDialog";

// Admin portal root: theme (dark/light), session + a SweetAlert-style confirm
// dialog available to all admin screens.
export default function AdminLayout({ children }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
