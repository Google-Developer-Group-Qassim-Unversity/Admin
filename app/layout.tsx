import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { DirectionProvider } from "@/components/direction-provider";
import { ClerkProviderWrapper } from "@/components/clerk-provider-wrapper";
import { QueryProvider } from "@/lib/query-provider";
import { ConditionalNavbar, ConditionalWrapper } from "@/components/conditional-navbar";
import { Toaster } from "@/components/ui/sonner";
import { getDirection } from "@/i18n/config";
import { getLocale } from "@/i18n/locale";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-latin" });

// Figtree and Geist carry no Arabic glyphs. This sits behind them in the stack
// so Arabic renders properly in either locale - member names and event titles
// are often Arabic even while the UI is in English.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
});

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = getDirection(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${figtree.variable} ${plexArabic.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ClerkProviderWrapper locale={locale}>
              <DirectionProvider dir={dir}>
                <QueryProvider>
                  <div className="relative min-h-screen flex flex-col">
                    <ConditionalNavbar />
                    <ConditionalWrapper>{children}</ConditionalWrapper>
                  </div>
                  <Toaster />
                </QueryProvider>
              </DirectionProvider>
            </ClerkProviderWrapper>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
