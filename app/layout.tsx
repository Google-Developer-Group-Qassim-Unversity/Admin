import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, DM_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "700"],
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
})

export const metadata: Metadata = {
  title: "Admin Dashboard - Score Leaderboard",
  description: "Admin interface for managing department events and member participation",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#000000",
        },
      }}
    >
      <html lang="en">
        <body className={`font-sans ${spaceGrotesk.variable} ${dmSans.variable}`}>
          <SignedIn>
            <header className="flex justify-between items-center p-4 bg-background border-b">
              <h1 className="text-xl font-bold">Admin Dashboard - Score Leaderboard</h1>
              <div className="flex items-center gap-4">
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8",
                    },
                  }}
                />
              </div>
            </header>
          </SignedIn>
          
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
