import { SessionProvider } from "@/context/SessionContext";
import { ThemeProvider } from "@/context/ThemeContext";
import StudyTimeTracker from "@/components/portal/StudyTimeTracker";

// Student portal root: provides the session (logged-in user) and theme (dark/
// light) to all student screens. No website Navbar/Footer here — the portal
// has its own shell. The learning-time tracker lives here so it stays mounted
// across page navigations and keeps counting continuously.
export default function StudentLayout({ children }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <StudyTimeTracker />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}
