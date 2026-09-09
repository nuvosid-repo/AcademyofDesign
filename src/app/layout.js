import { Inter, Bebas_Neue } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

export const metadata = {
  title: "Nuvosid Academy of Design",
  description: "A premium design academy shaping the creative leaders of tomorrow.",
};

// Runs before first paint to set the saved theme and avoid a flash.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

// Root layout is now a MINIMAL common shell (html/body, fonts, theme, base CSS)
// shared by all three sections. Section-specific chrome lives in each section's
// own layout: (website)/layout.js, student/layout.js, admin/layout.js.
export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} ${bebas.variable} min-h-screen flex flex-col antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
