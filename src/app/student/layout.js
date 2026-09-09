import { SessionProvider } from "@/context/SessionContext";
import { ThemeProvider } from "@/context/ThemeContext";

// Student portal root: provides the session (logged-in user) and theme (dark/
// light) to all student screens. No website Navbar/Footer here — the portal
// has its own shell.
export default function StudentLayout({ children }) {
  return (
    <ThemeProvider>
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}
