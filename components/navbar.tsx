"use client";

import Link from "next/link";
import Image from "next/image";

import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButton } from "@/components/auth-button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/gdg.png" alt="Logo" width={362} height={200} className="h-5 w-9" priority unoptimized />
          <span className="hidden sm:inline-block">GDG Score Tracker Admin</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          <Link
            href="/events"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Events
          </Link>
          <Link
            href="/events/create"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Create Event
          </Link>
        </nav>

        {/* Right side - Theme toggle and User profile */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
