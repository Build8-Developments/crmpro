import type { Metadata } from "next";
import { Alan_Sans, Alexandria } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: "Nomow",
  description: "CRM for real-estate agencies",
};

const displayFont = Alexandria({
  subsets: ["latin", "arabic"],
  variable: "--font-alexandria",
  display: "swap",
});

const textFont = Alan_Sans({
  subsets: ["latin"],
  variable: "--font-alan-sans",
  display: "swap",
});

const themeInitScript = `
  (() => {
    try {
      const storedTheme = localStorage.getItem("crmpro-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme =
        storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : prefersDark ? "dark" : "light";
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${textFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
