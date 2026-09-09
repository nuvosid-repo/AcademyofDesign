import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import FixedCTA from "@/components/Home/FixedCTA";
import Providers from "@/components/Providers";

// Layout for the public marketing website (route group "(website)").
// Holds the shared Navbar / Footer / FixedCTA + Theme & Auth providers.
// The student and admin portals have their own layouts and do NOT get this chrome.
export default function WebsiteLayout({ children }) {
  return (
    <Providers>
      <Navbar />
      <main className="flex-grow pt-16">{children}</main>
      <Footer />
      <FixedCTA />
    </Providers>
  );
}
