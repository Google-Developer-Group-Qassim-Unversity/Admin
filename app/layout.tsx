import type { Metadata, Viewport } from "next";
import { Geist_Mono, Reem_Kufi, Tajawal } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { DirectionProvider } from "@/components/direction-provider";
import { ClerkProviderWrapper } from "@/components/clerk-provider-wrapper";
import { QueryProvider } from "@/lib/query-provider";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { getDirection } from "@/i18n/config";
import { getLocale } from "@/i18n/locale";

// Thmanyah Sans carries the interface in both scripts. Its licence forbids
// re-hosting it, so it is fetched from Thmanyah's site into public/fonts
// (scripts/fetch-thmanyah.mjs) and declared in globals.css; Tajawal stands in
// wherever it is missing.
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
});

// Reem Kufi is for display headings only: kufic geometry, like the carving on
// a Najdi door.
const reemKufi = Reem_Kufi({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-reem-kufi",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GDG Qassim · Admin",
  description: "Admin dashboard for Score Tracker application",
  icons: {
    icon: "/gdg.ico",
  },
};

// viewport-fit=cover lets the bottom nav and sheets run under the home
// indicator; they pad themselves with env(safe-area-inset-*).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#241d18" },
  ],
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
      className={`${tajawal.variable} ${reemKufi.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
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
                  <AppShell>{children}</AppShell>
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
