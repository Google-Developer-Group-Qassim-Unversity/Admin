import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree, IBM_Plex_Sans_Arabic } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import { NextIntlClientProvider } from "next-intl";
import "../globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { DirectionProvider } from "@/components/direction-provider";
import { Toaster } from "@/components/ui/sonner";
import { config } from "@/lib/config";
import { getDirection } from "@/i18n/config";
import { getLocale } from "@/i18n/locale";

// This route group is a second root layout, so it has to repeat the font and
// direction setup from app/layout.tsx rather than inherit it.
const figtree = Figtree({ subsets: ["latin"], variable: "--font-latin" });

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
  title: "Access Denied - GDG-Admin",
  description: "Access denied - Admin privileges required",
};

export default async function DeniedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = getDirection(locale);

  return (
    <ClerkProvider
      publishableKey={config.clerkPublishableKey}
      dynamic
      localization={locale === "ar" ? arSA : undefined}
    >
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
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <DirectionProvider dir={dir}>
                {/* No navbar here - just the page content */}
                {children}
                <Toaster />
              </DirectionProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
