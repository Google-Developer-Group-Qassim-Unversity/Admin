import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProviderWrapper } from "@/components/clerk-provider-wrapper";
import { QueryProvider } from "@/lib/query-provider";
import { ConditionalNavbar, ConditionalWrapper } from "@/components/conditional-navbar";
import { Toaster } from "@/components/ui/sonner";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GDG-Admin",
  description: "Admin dashboard for Score Tracker application",
  icons: {
    icon: "/gdg.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProviderWrapper>
            <QueryProvider>
              <div className="relative min-h-screen flex flex-col">
                <ConditionalNavbar />
                <ConditionalWrapper>{children}</ConditionalWrapper>
              </div>
              <Toaster />
            </QueryProvider>
          </ClerkProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
