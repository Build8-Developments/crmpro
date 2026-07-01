import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: "CRMPro",
  description: "CRM for real estate marketing agencies",
};

const themeInitScript = `
  (() => {
    try {
      const storedTheme = localStorage.getItem("crmpro-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = storedTheme ?? (prefersDark ? "dark" : "light");
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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
